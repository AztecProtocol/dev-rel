/**
 * @fileoverview Epoch Sync Service
 * @description Monitors epoch changes and automatically syncs validator data from L1, L2, and peer sources
 * @module sparta/ethereum/epoch-sync
 */

import { logger, sendJsonRpcRequest } from "@sparta/utils";
import type { Ethereum } from "./ethereum";
import type { ChainInfo } from "./ethereum";

// RPC endpoint URL
const DEFAULT_RPC_URL = process.env.AZTEC_RPC_URL || "http://localhost:8080";
const RPC_METHOD_VALIDATOR_STATS = "node_getValidatorsStats";

// Peer network crawler endpoint
const PEER_CRAWLER_URL = process.env.PEER_CRAWLER_URL || "https://aztec.nethermind.io/api/private/peers";
const PEER_CRAWLER_AUTH_TOKEN = process.env.PEER_CRAWLER_AUTH_TOKEN;
const DEFAULT_PEER_PAGE_SIZE = 2000;

// Polling interval for epoch changes (in milliseconds)
const EPOCH_POLL_INTERVAL = process.env.EPOCH_POLL_INTERVAL ? parseInt(process.env.EPOCH_POLL_INTERVAL) : 30000; // 30 seconds default

// Types from l2-info-service (we'll reuse these)
interface SlotInfo {
	timestamp: bigint;
	slot: bigint;
	date: string;
}

interface ValidatorStats {
	address: string;
	lastProposal?: SlotInfo;
	lastAttestation?: SlotInfo;
	totalSlots: number;
	missedProposals: { count: number; rate?: number };
	missedAttestations: { count: number; rate?: number };
	history: Array<{ slot: string; status: string }>;
}

interface ValidatorsStatsResponse {
	stats: { [address: string]: ValidatorStats };
	lastProcessedSlot?: bigint;
	initialSlot?: bigint;
	slotWindow: number;
}

interface PeerIpInfo {
	ip_address: string;
	port: number;
	as_name: string;
	as_number: number;
	city_name: string;
	country_name: string;
	country_iso: string;
	continent_name: string;
	continent_code: string;
	latitude: number;
	longitude: number;
}

interface PeerMultiAddress {
	maddr: string;
	ip_info: PeerIpInfo[];
}

interface PeerData {
	id: string;
	created_at: string;
	last_seen: string;
	client: string;
	multi_addresses: PeerMultiAddress[];
	protocols?: string[] | null;
	block_height?: number | null;
	spec_version?: string | null;
	is_synced?: boolean | null;
}

interface PeerCrawlerResponse {
	peers: PeerData[];
}

/**
 * Service that monitors epoch changes and syncs validator data
 */
export class EpochSyncService {
	private ethereum: Ethereum;
	private lastSyncedEpoch: number | null = null;
	private isRunning: boolean = false;
	private isSyncing: boolean = false; // Guard against overlapping syncs
	private pollInterval: NodeJS.Timeout | null = null;
	private rpcUrl: string;
	
	// Differential sync state tracking
	/**
	 * Global last processed slot from L2 RPC. This is now used only for:
	 * 1. Detecting if there's any new data available globally
	 * 2. Logging and monitoring purposes
	 * 
	 * Individual validator history tracking is done per-validator via the 
	 * validator history table to enable efficient backfilling and resume
	 * after service restarts.
	 */
	private lastL2ProcessedSlot: bigint | null = null;
	private lastPeerSyncTimestamp: number | null = null;
	private knownValidatorAddresses: Set<string> = new Set();

	constructor(ethereum: Ethereum) {
		this.ethereum = ethereum;
		this.rpcUrl = process.env.AZTEC_NODE_URL || DEFAULT_RPC_URL;
	}

	/**
	 * Starts the epoch monitoring service
	 */
	public start(): void {
		if (this.isRunning) {
			logger.warn("Epoch sync service is already running");
			return;
		}

		this.isRunning = true;
		logger.info(`Starting epoch sync service with poll interval: ${EPOCH_POLL_INTERVAL}ms`);

		// Initialize differential sync state
		this.initializeDifferentialSyncState().catch(error => {
			logger.error(error, "Error during differential sync state initialization");
		});

		// Initial sync
		this.checkAndSync().catch(error => {
			logger.error(error, "Error during initial epoch sync");
		});

		// Set up polling interval
		this.pollInterval = setInterval(() => {
			this.checkAndSync().catch(error => {
				logger.error(error, "Error during epoch sync poll");
			});
		}, EPOCH_POLL_INTERVAL);
	}

	/**
	 * Stops the epoch monitoring service
	 */
	public stop(): void {
		if (!this.isRunning) {
			return;
		}

		this.isRunning = false;
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
		logger.info("Stopped epoch sync service");
	}

	/**
	 * Checks current epoch and syncs if needed
	 */
	private async checkAndSync(): Promise<void> {
		// Skip if already syncing
		if (this.isSyncing) {
			logger.warn("Sync already in progress, skipping this poll");
			return;
		}

		try {
			this.isSyncing = true;
			const syncStartTime = Date.now();
            console.log("Checking and syncing epoch data");
			
			// Get current rollup info
			const rollupInfo = await this.ethereum.getRollupInfo();
			const currentEpoch = Number(rollupInfo.currentEpoch);

			// Check if we need to sync
			if (this.lastSyncedEpoch === currentEpoch) {
				logger.debug(`Already synced for epoch ${this.lastSyncedEpoch} (${currentEpoch} on-chain)`);
				return;
			}

			logger.info(`Epoch changed from ${this.lastSyncedEpoch} to ${currentEpoch}, starting sync`);

			// Import validator service dynamically to avoid circular dependencies
			const { validatorService } = await import("@sparta/api/src/domain/validators/service");

			// Perform the sync
			await this.syncAllData(rollupInfo, currentEpoch, validatorService);

			// Mark this epoch as synced
			this.lastSyncedEpoch = currentEpoch;

			const syncDuration = Date.now() - syncStartTime;
			logger.info(`Completed sync for epoch ${currentEpoch} in ${syncDuration}ms`);
			
			// Warn if sync took longer than poll interval
			if (syncDuration > EPOCH_POLL_INTERVAL) {
				logger.warn(
					`Sync duration (${syncDuration}ms) exceeded poll interval (${EPOCH_POLL_INTERVAL}ms). Consider increasing EPOCH_POLL_INTERVAL to avoid overlap.`
				);
			}
		} catch (error) {
			logger.error(error, "Error checking and syncing epoch data");
			throw error;
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Main sync orchestrator
	 */
	private async syncAllData(
		rollupInfo: ChainInfo,
		currentEpoch: number,
		validatorService: any
	): Promise<void> {
		try {
			const syncStats = {
				l1NewValidators: 0,
				l2ProcessedValidators: 0,
				l2SkippedValidators: 0,
				peerUpdatedValidators: 0,
				activeStatusUpdates: 0,
			};

			// Step 1: Sync L1 data (ensure all validators from chain exist in DB)
			const l1StartTime = Date.now();
			await this.syncL1Data(rollupInfo.validators, validatorService);
			const l1Duration = Date.now() - l1StartTime;

			// Step 2: Get all validators from database
			const dbStartTime = Date.now();
			let allValidators: any[] = [];
			let nextPageToken: string | undefined = undefined;

			do {
				// Use getAllValidators with pagination, keeping the default parameters for history
				const result: { validators: any[]; nextPageToken?: string } = await validatorService.getAllValidators(nextPageToken, true, 5);
				allValidators = allValidators.concat(result.validators);
				nextPageToken = result.nextPageToken;
			} while (nextPageToken);
			const dbDuration = Date.now() - dbStartTime;

			logger.info(`Found ${allValidators.length} validators in database (fetched in ${dbDuration}ms)`);

			// Step 3: Update active status for all validators based on current rollup
			const activeStatusStartTime = Date.now();
			const activeValidatorSet = new Set(rollupInfo.validators.map(addr => addr.toLowerCase()));
			
			const activeStatusUpdates: Array<{ validatorAddress: string; statsData: any }> = [];
			
			for (const validator of allValidators) {
				const isActive = activeValidatorSet.has(validator.validatorAddress.toLowerCase());
				
				// Only update if the status would change (assuming we store isActive in the database)
				// For now, we'll always update to ensure consistency
				activeStatusUpdates.push({
					validatorAddress: validator.validatorAddress,
					statsData: { isActive }
				});
			}
			
			if (activeStatusUpdates.length > 0) {
				const activeStatusUpdateCount = await validatorService.batchUpdateValidatorStats(activeStatusUpdates);
				syncStats.activeStatusUpdates = activeStatusUpdateCount;
				logger.info(`Updated active status for ${activeStatusUpdateCount} validators based on current rollup (${activeValidatorSet.size} active)`);
			}
			
			const activeStatusDuration = Date.now() - activeStatusStartTime;

			// Step 4: Sync L2 data (Aztec RPC stats including history)
			const l2StartTime = Date.now();
			await this.syncL2Data(allValidators.map(v => v.validatorAddress), currentEpoch, validatorService);
			const l2Duration = Date.now() - l2StartTime;

			// Step 5: Sync peer data
			const peerStartTime = Date.now();
			const peerNetworkData = await this.syncPeerData(validatorService);
			const peerDuration = Date.now() - peerStartTime;

			// Step 6: Calculate and store network-wide statistics
			const statsStartTime = Date.now();
			await this.calculateAndStoreNetworkStats(currentEpoch, rollupInfo, validatorService, peerNetworkData);
			const statsDuration = Date.now() - statsStartTime;

			// Log differential sync effectiveness
			logger.info(
				`Sync performance summary: L1=${l1Duration}ms, ActiveStatus=${activeStatusDuration}ms, L2=${l2Duration}ms, Peer=${peerDuration}ms, DB fetch=${dbDuration}ms, Stats=${statsDuration}ms`
			);
		} catch (error) {
			logger.error(error, "Error syncing all data");
			throw error;
		}
	}

	/**
	 * Sync L1 validator data from blockchain
	 */
	private async syncL1Data(
		blockchainValidators: string[],
		validatorService: any
	): Promise<void> {
		// Differential sync: only process new validators
		const newValidators = blockchainValidators.filter(address => 
			!this.knownValidatorAddresses.has(address.toLowerCase())
		);
		
		if (newValidators.length === 0) {
			logger.debug("L1 sync: No new validators to process");
			return;
		}

		logger.info(`L1 sync: Processing ${newValidators.length} new validators (${blockchainValidators.length} total on chain)`);

		// Process validators in smaller batches to avoid DynamoDB throttling
		const BATCH_SIZE = 20; // Reduced from 10 to avoid throttling
		const BATCH_DELAY_MS = 250; // Increased from 100ms to 250ms delay between batches
		const MAX_RETRIES = 3;
		
		let successCount = 0;
		let failureCount = 0;
		
		for (let i = 0; i < newValidators.length; i += BATCH_SIZE) {
			const batch = newValidators.slice(i, i + BATCH_SIZE);
			const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
			const totalBatches = Math.ceil(newValidators.length / BATCH_SIZE);
			
			logger.debug(`L1 sync: Processing batch ${batchNumber}/${totalBatches} (${batch.length} validators)`);
			
			let retryCount = 0;
			let batchSuccess = false;
			
			while (!batchSuccess && retryCount < MAX_RETRIES) {
				try {
					// Process batch with controlled concurrency
					const batchPromises = batch.map(address =>
						validatorService.ensureValidatorExists(address)
							.then(() => ({ success: true, address }))
							.catch((error: any) => {
								// Log specific error details for debugging
								if (error.name === 'ThrottlingException' || error.message?.includes('Throughput exceeds')) {
									throw error; // Let batch-level retry handle this
								} else {
									logger.error({ error, address }, "Error ensuring validator exists");
								}
								return { success: false, address, error };
							})
					);
					
					const batchResults = await Promise.all(batchPromises);
					
					// Count successes and failures
					batchResults.forEach(result => {
						if (result.success) {
							successCount++;
							// Update known validators set only on success
							this.knownValidatorAddresses.add(result.address.toLowerCase());
						} else {
							failureCount++;
						}
					});
					
					batchSuccess = true;
				} catch (error: any) {
					retryCount++;
					
					if (error.name === 'ThrottlingException' || error.message?.includes('Throughput exceeds')) {
						const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 15000); // Exponential backoff up to 15s
						logger.warn(
							{ 
								batchNumber, 
								retryCount,
								backoffMs,
								error: error.message 
							},
							"DynamoDB throttling detected in L1 sync, backing off"
						);
						await new Promise(resolve => setTimeout(resolve, backoffMs));
					} else {
						// Non-throttling error, break the retry loop
						logger.error(
							{ error, batchNumber },
							"Non-throttling error in L1 sync batch"
						);
						break;
					}
					
					if (retryCount >= MAX_RETRIES) {
						logger.error(
							{ batchNumber, retryCount },
							"Failed to process L1 sync batch after max retries"
						);
						// Count remaining items in batch as failures
						failureCount += batch.length;
					}
				}
			}
			
			// Add delay between batches to avoid overwhelming DynamoDB
			if (i + BATCH_SIZE < newValidators.length) {
				await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
			}
		}

		if (failureCount > 0) {
			logger.warn(`L1 sync: Failed to ensure ${failureCount} new validators exist in database`);
		}

		logger.info(`L1 sync completed: ${successCount} new validators ensured in database, ${failureCount} failures`);
	}

	/**
	 * Sync L2 validator data from Aztec RPC
	 */
	private async syncL2Data(
		validatorAddresses: string[],
		currentEpoch: number,
		validatorService: any
	): Promise<void> {
		logger.info(`Starting L2 sync for ${validatorAddresses.length} validators`);

		// Fetch raw validator stats from Aztec RPC
		const rawValidatorStats = await this.fetchRawValidatorStats();
		
		// Check if we have new data to process
		const currentProcessedSlot = rawValidatorStats.lastProcessedSlot;
		
		if (this.lastL2ProcessedSlot !== null && currentProcessedSlot) {
			if (currentProcessedSlot <= this.lastL2ProcessedSlot) {
				logger.info(`L2 sync: No new data to process (current slot: ${currentProcessedSlot}, last processed: ${this.lastL2ProcessedSlot})`);
				return;
			}
			logger.info(`L2 sync: Processing new data from slot ${this.lastL2ProcessedSlot + 1n} to ${currentProcessedSlot}`);
		} else {
			logger.info(`L2 sync: Initial sync or missing slot info, processing all available data`);
		}

		// Import validator history repository
		const { validatorHistoryRepository } = await import("@sparta/api/src/db/validatorHistoryRepository");

		// Step 1: Process stats and handle validator creation/updates
		const statsUpdates: Array<{ validatorAddress: string; statsData: any }> = [];
		const validatorsWithHistory: Array<{ address: string; rpcHistory: Array<{ slot: string; status: string }> }> = [];
		
		for (const validatorAddress of validatorAddresses) {
			const lowerCaseAddress = validatorAddress.toLowerCase();
			const rawStats = rawValidatorStats.stats[lowerCaseAddress];
			
			// Ensure validator exists (create if not present)
			try {
				await validatorService.ensureValidatorExists(validatorAddress);
			} catch (error) {
				logger.error({ error, validatorAddress }, "Failed to ensure validator exists");
				continue;
			}

			// Process the raw stats
			const processedStats = this.processValidatorStats(lowerCaseAddress, rawStats);
		
			// Convert to database format (BigInt to string for storage)
			const statsData = {
				epoch: currentEpoch,
				hasAttested24h: processedStats.hasAttested24h,
				lastAttestationSlot: processedStats.lastAttestationSlot?.toString(),
				lastAttestationTimestamp: processedStats.lastAttestationTimestamp?.toString(),
				lastAttestationDate: processedStats.lastAttestationDate,
				lastProposalSlot: processedStats.lastProposalSlot?.toString(),
				lastProposalTimestamp: processedStats.lastProposalTimestamp?.toString(),
				lastProposalDate: processedStats.lastProposalDate,
				missedAttestationsCount: processedStats.missedAttestationsCount,
				missedProposalsCount: processedStats.missedProposalsCount,
				totalSlots: processedStats.totalSlots,
			};
		
			statsUpdates.push({ validatorAddress, statsData });

			// Collect validators that have history data from RPC
			if (rawStats && rawStats.history && Array.isArray(rawStats.history) && rawStats.history.length > 0) {
				validatorsWithHistory.push({
					address: validatorAddress,
					rpcHistory: rawStats.history
				});
			}
		}

		// Step 2: Batch update validator stats
		if (statsUpdates.length > 0) {
			const updateCount = await validatorService.batchUpdateValidatorStats(statsUpdates);
			logger.info(`L2 sync: Updated stats for ${updateCount} validators`);
		}

		// Step 3: Handle history syncing
		if (validatorsWithHistory.length > 0) {
			await this.syncValidatorHistory(validatorsWithHistory, validatorHistoryRepository);
		}

		// Update our last processed slot
		if (currentProcessedSlot) {
			this.lastL2ProcessedSlot = currentProcessedSlot;
		}
		
		logger.info(`L2 sync completed: processed ${validatorAddresses.length} validators`);
	}

	/**
	 * Sync validator history from RPC to database
	 * Only adds new entries that don't already exist in the database
	 */
	private async syncValidatorHistory(
		validatorsWithHistory: Array<{ address: string; rpcHistory: Array<{ slot: string; status: string }> }>,
		validatorHistoryRepository: any
	): Promise<void> {
		logger.info(`Starting history sync for ${validatorsWithHistory.length} validators with history data`);

		// Get current latest slots for all validators from database
		const validatorAddresses = validatorsWithHistory.map(v => v.address);
		const latestSlots = await validatorHistoryRepository.getBatchLatestSlots(validatorAddresses);

		// Log summary of what we're about to process
		const validatorsWithNoHistory = validatorsWithHistory.filter(v => latestSlots[v.address.toLowerCase()] === null).length;
		const validatorsWithExistingHistory = validatorsWithHistory.length - validatorsWithNoHistory;
		
		logger.info(
			`History sync state: ${validatorsWithNoHistory} validators with no history, ${validatorsWithExistingHistory} validators with existing history`
		);

		// Process each validator's history with concurrency control
		const CONCURRENCY_LIMIT = 3;
		let totalNewEntries = 0;
		let totalSkippedValidators = 0;
		
		for (let i = 0; i < validatorsWithHistory.length; i += CONCURRENCY_LIMIT) {
			const batch = validatorsWithHistory.slice(i, i + CONCURRENCY_LIMIT);
			const batchNumber = Math.floor(i / CONCURRENCY_LIMIT) + 1;
			const totalBatches = Math.ceil(validatorsWithHistory.length / CONCURRENCY_LIMIT);
			
			logger.debug(`Processing history batch ${batchNumber}/${totalBatches} (${batch.length} validators)`);
			
			const batchPromises = batch.map(async ({ address, rpcHistory }) => {
				try {
					const latestDbSlot = latestSlots[address.toLowerCase()];
					
					// Log RPC history details for debugging
					if (rpcHistory.length > 0) {
						const slots = rpcHistory.map(h => parseInt(h.slot, 10)).sort((a, b) => a - b);
						const minSlot = slots[0];
						const maxSlot = slots[slots.length - 1];
						
						logger.debug(
							{ 
								validatorAddress: address,
								rpcHistoryCount: rpcHistory.length,
								rpcSlotRange: `${minSlot}-${maxSlot}`,
								latestDbSlot: latestDbSlot?.toString() || 'none'
							},
							"RPC history details for validator"
						);
					}

					if (latestDbSlot === null) {
						// No history in DB, add all RPC history
						await validatorHistoryRepository.addValidatorHistory(address, rpcHistory);
						logger.info(
							{ 
								validatorAddress: address, 
								entriesAdded: rpcHistory.length,
								action: 'initial-sync'
							},
							"Added initial history for validator"
						);
						return { address, newEntries: rpcHistory.length, skipped: false };
					} else {
						// RPC history exists, only add new entries
						const newEntries = rpcHistory.filter((entry: { slot: string; status: string }) => {
							const entrySlot = BigInt(entry.slot);
							return entrySlot > latestDbSlot;
						});
						
						if (newEntries.length > 0) {
							await validatorHistoryRepository.addValidatorHistory(address, newEntries);
							logger.info(
								{ 
									validatorAddress: address,
									latestDbSlot: latestDbSlot.toString(),
									newEntries: newEntries.length,
									action: 'incremental-sync'
								},
								"Added new history entries for validator"
							);
							return { address, newEntries: newEntries.length, skipped: false };
						} else {
							logger.debug(
								{ 
									validatorAddress: address,
									latestDbSlot: latestDbSlot.toString(),
									action: 'skip-up-to-date'
								},
								"No new history entries to add for validator"
							);
							return { address, newEntries: 0, skipped: true };
						}
					}
				} catch (error) {
					logger.error(
						{ error, validatorAddress: address },
						"Failed to sync history for validator"
					);
					return { address, newEntries: 0, skipped: false, error };
				}
			});

			const batchResults = await Promise.all(batchPromises);
			
			// Accumulate statistics
			batchResults.forEach(result => {
				totalNewEntries += result.newEntries;
				if (result.skipped) totalSkippedValidators++;
			});
			
			// Add delay between batches to avoid overwhelming DynamoDB
			if (i + CONCURRENCY_LIMIT < validatorsWithHistory.length) {
				await new Promise(resolve => setTimeout(resolve, 200));
			}
		}

		logger.info(
			`History sync completed: ${totalNewEntries} new entries added across all validators, ${totalSkippedValidators} validators were already up-to-date`
		);
	}

	/**
	 * Sync peer data from crawler
	 */
	private async syncPeerData(validatorService: any): Promise<PeerCrawlerResponse> {
		logger.info("Starting peer data sync from crawler");

		// Get all validators with peer IDs
		let validatorsWithPeers: Array<{ validatorAddress: string; peerId: string }> = [];
		let nextPageToken: string | undefined = undefined;

		do {
			const result: { validators: any[]; nextPageToken?: string } = await validatorService.getAllValidators(nextPageToken);
			for (const validator of result.validators) {
				if (validator.peerId) {
					validatorsWithPeers.push({
						validatorAddress: validator.validatorAddress,
						peerId: validator.peerId
					});
				}
			}
			nextPageToken = result.nextPageToken;
		} while (nextPageToken);

		if (validatorsWithPeers.length === 0) {
			logger.info("Peer sync: No validators with peer IDs found");
			return { peers: [] };
		}

		// Fetch peer data from crawler
		const peerNetworkResponse = await this.fetchPeerNetworkData(DEFAULT_PEER_PAGE_SIZE);
		const peerDataMap = new Map<string, PeerData>();

		// Build peer data map with timestamp filtering for differential sync
		let newOrUpdatedPeers = 0;
		const currentSyncTime = Date.now();

		for (const peer of peerNetworkResponse.peers) {
			// For differential sync, only include peers that have been updated since our last sync
			if (this.lastPeerSyncTimestamp === null) {
				// Initial sync - include all peers
				peerDataMap.set(peer.id, peer);
				newOrUpdatedPeers++;
			} else {
				// Check if peer has been updated since last sync
				const peerLastSeen = new Date(peer.last_seen).getTime();
				if (peerLastSeen > this.lastPeerSyncTimestamp) {
					peerDataMap.set(peer.id, peer);
					newOrUpdatedPeers++;
				}
			}
		}

		if (newOrUpdatedPeers === 0) {
			logger.info(`Peer sync: No updated peers found since ${this.lastPeerSyncTimestamp ? new Date(this.lastPeerSyncTimestamp).toISOString() : 'never'}`);
			return { peers: [] };
		}

		logger.info(`Peer sync: Found ${newOrUpdatedPeers} updated peers out of ${peerNetworkResponse.peers.length} total peers`);

		// Process peer data updates for validators (only for updated peers)
		const peerUpdates: Array<{ validatorAddress: string; statsData: any }> = [];

		for (const { validatorAddress, peerId } of validatorsWithPeers) {
			const peerData = peerDataMap.get(peerId);
			if (!peerData) {
				// Peer not in updated set, skip
				continue;
			}

			const firstMultiAddr = peerData.multi_addresses?.[0];
			const firstIpInfo = firstMultiAddr?.ip_info?.[0];

			const processedPeerData = {
				peerClient: peerData.client,
				peerCountry: firstIpInfo?.country_name,
				peerCity: firstIpInfo?.city_name,
				peerIpAddress: firstIpInfo?.ip_address,
				peerPort: firstIpInfo?.port,
				peerIsSynced: peerData.is_synced,
				peerBlockHeight: peerData.block_height,
				peerLastSeen: peerData.last_seen,
			};

			peerUpdates.push({
				validatorAddress,
				statsData: processedPeerData
			});
		}

		if (peerUpdates.length === 0) {
			logger.info("Peer sync: No validator peer data needs updating");
			return { peers: [] };
		}

		// Batch update peer data
		const updateCount = await validatorService.batchUpdateValidatorStats(peerUpdates);
		
		// Update our last peer sync timestamp
		this.lastPeerSyncTimestamp = currentSyncTime;
		
		logger.info(`Peer sync completed: processed ${peerUpdates.length} validators with updated peer data, successfully updated ${updateCount}`);

		return { peers: peerNetworkResponse.peers };
	}

	/**
	 * Fetches raw validator stats from RPC
	 */
	private async fetchRawValidatorStats(): Promise<ValidatorsStatsResponse> {
		try {
			return (await sendJsonRpcRequest(
				this.rpcUrl,
				RPC_METHOD_VALIDATOR_STATS,
				[]
			)) as ValidatorsStatsResponse;
		} catch (error) {
			logger.error(error, "Error fetching raw validator stats from RPC");
			throw error;
		}
	}

	/**
	 * Fetches peer network data from crawler API
	 */
	private async fetchPeerNetworkData(pageSize: number = DEFAULT_PEER_PAGE_SIZE): Promise<PeerCrawlerResponse> {
		try {
			// Check if auth token is available
			if (!PEER_CRAWLER_AUTH_TOKEN) {
				throw new Error("PEER_CRAWLER_AUTH_TOKEN environment variable is required but not set");
			}

			let allPeers: PeerData[] = [];
			let nextPaginationToken: string | undefined = undefined;
			let pageCount = 0;
			const maxPages = 50; // Safety limit

			do {
				// Build URL with query parameters
				const url = new URL(PEER_CRAWLER_URL);
				url.searchParams.set('page_size', pageSize.toString());
				url.searchParams.set('latest', 'true');

				// Add pagination token if we have one
				if (nextPaginationToken) {
					url.searchParams.set('pagination_token', nextPaginationToken);
				}

				const response = await fetch(url.toString(), {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Basic ${PEER_CRAWLER_AUTH_TOKEN}`,
					},
				});

				if (!response.ok) {
					throw new Error(
						`HTTP error! status: ${response.status} ${response.statusText}`
					);
				}

				const data = await response.json();

				// Add peers from this page to our collection
				if (data.peers && Array.isArray(data.peers)) {
					allPeers.push(...data.peers);
				}

				// Check for next page
				nextPaginationToken = data.next_pagination_token;
				pageCount++;

				logger.debug(`Fetched page ${pageCount} with ${data.peers?.length || 0} peers (total so far: ${allPeers.length})`);

				// Safety check to prevent infinite loops
				if (pageCount >= maxPages) {
					logger.warn(`Reached maximum page limit (${maxPages}) while fetching peer data`);
					break;
				}

			} while (nextPaginationToken);

			logger.info(`Completed peer data fetch: ${pageCount} pages, ${allPeers.length} total peers`);

			return { peers: allPeers };
		} catch (error) {
			logger.error(error, "Error fetching peer network data");
			throw error;
		}
	}

	/**
	 * Helper method to process individual validator stats
	 */
	private processValidatorStats(address: string, validatorStats: any): any {
		// Handle case where validatorStats is undefined or null
		if (!validatorStats) {
			return {
				hasAttested24h: false,
				lastAttestationSlot: undefined,
				lastAttestationTimestamp: undefined,
				lastAttestationDate: undefined,
				lastProposalSlot: undefined,
				lastProposalTimestamp: undefined,
				lastProposalDate: undefined,
				missedAttestationsCount: 0,
				missedProposalsCount: 0,
				totalSlots: 0,
			};
		}

		const lastAttestation = validatorStats.lastAttestation;
		const lastProposal = validatorStats.lastProposal;
		let hasAttested24h = false;
		let lastAttestationTimestampBigInt: bigint | undefined = undefined;
		let lastProposalTimestampBigInt: bigint | undefined = undefined;
		let lastProposalSlotBigInt: bigint | undefined = undefined;
		let lastProposalDate: string | undefined = undefined;

		if (lastAttestation) {
			try {
				lastAttestationTimestampBigInt = BigInt(lastAttestation.timestamp);
				const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
				const twentyFourHoursAgoSeconds = nowSeconds - BigInt(24 * 60 * 60);

				if (lastAttestationTimestampBigInt >= twentyFourHoursAgoSeconds) {
					hasAttested24h = true;
				}
			} catch (e) {
				logger.error(e, "Error converting attestation timestamp to BigInt");
			}
		}

		if (lastProposal) {
			try {
				lastProposalTimestampBigInt = BigInt(lastProposal.timestamp);
				lastProposalSlotBigInt = BigInt(lastProposal.slot);
				lastProposalDate = lastProposal.date;
			} catch (e) {
				logger.error(e, "Error converting proposal timestamp/slot to BigInt");
			}
		}

		return {
			hasAttested24h,
			lastAttestationSlot: lastAttestation ? BigInt(lastAttestation.slot) : undefined,
			lastAttestationTimestamp: lastAttestationTimestampBigInt,
			lastAttestationDate: lastAttestation?.date,
			lastProposalSlot: lastProposalSlotBigInt,
			lastProposalTimestamp: lastProposalTimestampBigInt,
			lastProposalDate: lastProposalDate,
			missedAttestationsCount: validatorStats.missedAttestations?.count || 0,
			missedProposalsCount: validatorStats.missedProposals?.count || 0,
			totalSlots: validatorStats.totalSlots || 0,
		};
	}

	/**
	 * Initializes the differential sync state
	 */
	private async initializeDifferentialSyncState(): Promise<void> {
		try {
			// Import validator service dynamically to avoid circular dependencies
			const { validatorService } = await import("@sparta/api/src/domain/validators/service");

			// Get all existing validators from database to initialize known validators set
			// Use pagination to avoid overwhelming the database
			let allValidators: string[] = [];
			let nextPageToken: string | undefined = undefined;
			let pageCount = 0;

			do {
				try {
					const result: { validators: { validatorAddress: string }[]; nextPageToken?: string } = 
						await validatorService.getAllValidators(nextPageToken);
					allValidators = allValidators.concat(result.validators.map((v: any) => v.validatorAddress));
					nextPageToken = result.nextPageToken;
					pageCount++;
					
					// Add small delay between pages to avoid throttling
					if (nextPageToken) {
						await new Promise(resolve => setTimeout(resolve, 50));
					}
				} catch (error: any) {
					if (error.name === 'ThrottlingException') {
						logger.warn({ pageCount }, "DynamoDB throttling during initialization, waiting before retry");
						// Wait longer on throttling errors
						await new Promise(resolve => setTimeout(resolve, 1000));
						// Retry the same page
						continue;
					}
					throw error;
				}
			} while (nextPageToken);

			// Update known validators set with existing validators
			allValidators.forEach(address => {
				this.knownValidatorAddresses.add(address.toLowerCase());
			});

			// Note: We no longer need to track a global lastL2ProcessedSlot for history filtering
			// as we now use per-validator tracking via the validator history table.
			// We still fetch it for logging purposes and to detect if there's new global data.
			const rawValidatorStats = await this.fetchRawValidatorStats();
			
			// Update last processed slot (handle undefined case)
			if (rawValidatorStats.lastProcessedSlot !== undefined) {
				this.lastL2ProcessedSlot = rawValidatorStats.lastProcessedSlot;
			}
			
			// Set initial peer sync timestamp to now
			this.lastPeerSyncTimestamp = Date.now() - (24 * 60 * 60 * 1000); // Start from 24 hours ago to catch recent changes

			logger.info(
				`Differential sync state initialized: ${allValidators.length} known validators, ` +
				`global L2 slot: ${this.lastL2ProcessedSlot} (per-validator tracking enabled)`
			);
		} catch (error) {
			logger.error(error, "Failed to initialize differential sync state");
			// Continue without differential sync state - will fall back to full sync
		}
	}

	private async calculateAndStoreNetworkStats(
		currentEpoch: number,
		rollupInfo: ChainInfo,
		validatorService: any,
		peerNetworkData: PeerCrawlerResponse
	): Promise<void> {
		try {
			// Import network stats repository dynamically
			const { networkStatsRepository } = await import("@sparta/api/src/db/networkStatsRepository");

			// Get all validators from database with their stats
			let allValidators: any[] = [];
			let nextPageToken: string | undefined = undefined;

			do {
				const result: { validators: any[]; nextPageToken?: string } = await validatorService.getAllValidators(nextPageToken);
				allValidators = allValidators.concat(result.validators);
				nextPageToken = result.nextPageToken;
			} while (nextPageToken);

			// Process peer network data for distribution statistics
			const countryDistribution: Record<string, number> = {};
			const clientDistribution: Record<string, number> = {};
			const ispDistribution: Record<string, number> = {};

			for (const peer of peerNetworkData.peers) {
				// Client distribution
				if (peer.client) {
					clientDistribution[peer.client] = (clientDistribution[peer.client] || 0) + 1;
				}

				// Country and ISP distribution
				const firstMultiAddr = peer.multi_addresses?.[0];
				const firstIpInfo = firstMultiAddr?.ip_info?.[0];
				if (firstIpInfo) {
					// Country
					if (firstIpInfo.country_name) {
						countryDistribution[firstIpInfo.country_name] =
							(countryDistribution[firstIpInfo.country_name] || 0) + 1;
					}
					// ISP
					if (firstIpInfo.as_name) {
						ispDistribution[firstIpInfo.as_name] =
							(ispDistribution[firstIpInfo.as_name] || 0) + 1;
					}
				}
			}

			// Calculate validator statistics
			let validatorsAttested24h = 0;
			let validatorsProposed24h = 0;
			let totalAttestationMissRate = 0;
			let totalProposalMissRate = 0;
			let validatorsWithStats = 0;
			let validatorsWithPeers = 0;

			for (const validator of allValidators) {
				// Count 24h activity
				if (validator.hasAttested24h) {
					validatorsAttested24h++;
				}

				// Check if proposed in last 24h
				if (validator.lastProposalTimestamp) {
					const proposalTimestamp = BigInt(validator.lastProposalTimestamp);
					const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
					const twentyFourHoursAgoSeconds = nowSeconds - BigInt(24 * 60 * 60);
					if (proposalTimestamp >= twentyFourHoursAgoSeconds) {
						validatorsProposed24h++;
					}
				}

				// Calculate miss rates
				if (validator.totalSlots && validator.totalSlots > 0) {
					validatorsWithStats++;
					if (validator.missedAttestationsCount) {
						totalAttestationMissRate += validator.missedAttestationsCount / validator.totalSlots;
					}
					if (validator.missedProposalsCount) {
						totalProposalMissRate += validator.missedProposalsCount / validator.totalSlots;
					}
				}

				// Count validators with peers
				if (validator.peerId) {
					validatorsWithPeers++;
				}
			}

			// Calculate averages
			const avgAttestationMissRate = validatorsWithStats > 0 ? totalAttestationMissRate / validatorsWithStats : 0;
			const avgProposalMissRate = validatorsWithStats > 0 ? totalProposalMissRate / validatorsWithStats : 0;

			// Find top country
			let topCountry: { country: string; count: number } | undefined = undefined;
			for (const [country, count] of Object.entries(countryDistribution)) {
				if (!topCountry || count > topCountry.count) {
					topCountry = { country, count };
				}
			}

			// Find top 3 countries
			const top3Countries = Object.entries(countryDistribution)
				.map(([country, count]) => ({ country, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 3);

			// Find top ISP
			let topISP: { isp: string; count: number } | undefined = undefined;
			for (const [isp, count] of Object.entries(ispDistribution)) {
				if (!topISP || count > topISP.count) {
					topISP = { isp, count };
				}
			}

			// Create network stats object
			const networkStats = {
				epochNumber: currentEpoch,
				timestamp: Date.now(),
				
				// Basic counts
				totalValidatorsInSet: rollupInfo.validators.length,
				activeValidators: validatorsAttested24h,
				totalPeersInNetwork: peerNetworkData.peers.length,
				
				// Performance metrics
				networkAttestationMissRate: avgAttestationMissRate,
				networkProposalMissRate: avgProposalMissRate,
				
				// Geographic distribution
				countryDistribution,
				topCountry,
				top3Countries,
				
				// Client distribution
				clientDistribution,
				
				// ISP distribution
				ispDistribution,
				topISP,
				
				// Activity metrics
				validatorsAttested24h,
				validatorsProposed24h,
				
				// Network health
				validatorsWithPeers,
				
				// Slot information
				currentSlot: Number(rollupInfo.currentSlot),
				
				// Metadata
				createdAt: Date.now(),
			};

			// Store network stats in database
			await networkStatsRepository.upsert(networkStats);

			logger.info(
				{
					epochNumber: currentEpoch,
					totalValidators: rollupInfo.validators.length,
					activeValidators: validatorsAttested24h,
					totalPeers: peerNetworkData.peers.length,
					topCountry: topCountry?.country,
					topISP: topISP?.isp,
				},
				"Network statistics calculated and stored"
			);
		} catch (error) {
			logger.error(error, "Error calculating and storing network statistics");
			// Don't throw - we don't want to fail the entire sync if stats calculation fails
		}
	}
} 
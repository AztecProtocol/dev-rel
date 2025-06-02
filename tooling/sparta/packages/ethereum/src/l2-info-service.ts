/**
 * @fileoverview L2 Information service for blockchain data via JSON-RPC
 * @description Provides methods for retrieving L2 blockchain state and validator information
 * @module sparta/discord/services
 */

import { logger, sendJsonRpcRequest } from "@sparta/utils";
import { getEthereumInstance } from "./ethereum";

// RPC endpoint URL
const DEFAULT_RPC_URL = process.env.AZTEC_RPC_URL || "http://localhost:8080"; // Use env var or default
const RPC_METHOD_VALIDATOR_STATS = "node_getValidatorsStats";

// Peer network crawler endpoint
const PEER_CRAWLER_URL = process.env.PEER_CRAWLER_URL || "https://aztec.nethermind.io/api/private/peers";
const PEER_CRAWLER_AUTH_TOKEN = process.env.PEER_CRAWLER_AUTH_TOKEN;
const DEFAULT_PEER_PAGE_SIZE = 2000; // Get more peers by default, can be overridden

// --- Define types based on RPC response ---

interface SlotInfo {
	timestamp: bigint;
	slot: bigint;
	date: string;
}

interface ValidatorStats {
	address: string; // EthAddress as string
	lastProposal?: SlotInfo;
	lastAttestation?: SlotInfo;
	totalSlots: number;
	// Simplified missed stats for this use case, add more if needed
	missedProposals: { count: number; rate?: number };
	missedAttestations: { count: number; rate?: number };
	// history: ValidatorStatusHistory; // Assuming history is not directly needed for this check
}

interface ValidatorsStatsResponse {
	stats: { [address: string]: ValidatorStats };
	lastProcessedSlot?: bigint;
	initialSlot?: bigint;
	slotWindow: number;
}

interface JsonRpcResponse {
	jsonrpc: string;
	result?: any; // Make result optional and generic for different RPC methods
	id: number;
	error?: { code: number; message: string }; // Optional error object
}

/**
 * Result structure for the RPC-based attestation check
 */
interface RpcAttestationResult {
	hasAttested24h: boolean;
	lastAttestationSlot?: bigint;
	lastAttestationTimestamp?: bigint;
	lastAttestationDate?: string;
	lastProposalSlot?: bigint;
	lastProposalTimestamp?: bigint;
	lastProposalDate?: string;
	missedAttestationsCount?: number;
	missedProposalsCount?: number;
	totalSlots?: number;
	error?: string;
}

// --- Peer Network Types ---

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

interface PeerNetworkSummary {
	totalPeers: number;
	syncedPeers: number;
	clientDistribution: Record<string, number>;
	countryDistribution: Record<string, number>;
	avgBlockHeight?: number;
	lastUpdated: number;
	samplePeers: PeerData[]; // Store a few sample peers for display
}

interface ValidatorPeerInfo {
	validatorAddress: string;
	associatedPeers: PeerData[];
	networkSummary: PeerNetworkSummary;
}

/**
 * Comprehensive validator network statistics
 */
export interface ValidatorNetworkStats {
	// Basic counts
	totalValidatorsInSet: number;
	activeValidators: number; // validators who attested in last 24h
	totalPeersInNetwork: number;
	
	// Performance metrics
	networkAttestationMissRate: number; // average miss rate across all validators
	networkProposalMissRate: number; // average miss rate across all validators
	
	// Geographic distribution
	countryDistribution: Record<string, number>;
	topCountry: { country: string; count: number } | null;
	top3Countries: Array<{ country: string; count: number }>; // Top 3 countries by peer count
	
	// Client distribution
	clientDistribution: Record<string, number>;
	
	// ISP distribution
	ispDistribution: Record<string, number>;
	topISP: { isp: string; count: number } | null;
	
	// Activity metrics
	validatorsAttested24h: number;
	validatorsProposed24h: number;
	
	// Network health
	validatorsWithPeers: number; // validators that have associated peer IDs
	
	// Timing
	lastUpdated: number; // timestamp
	currentEpoch: number;
	currentSlot: number;
}

/**
 * Service for retrieving L2 blockchain information and validator data via RPC
 */
export class L2InfoService {
	private static instance: L2InfoService | null = null;
	private rpcUrl: string;
	private initialized: boolean = false;
	
	// Track the last epoch we updated the database for
	private lastUpdatedEpoch: number | null = null;
	
	// In-memory validator statistics
	private validatorStats: ValidatorNetworkStats | null = null;

	private constructor() {
		this.rpcUrl = DEFAULT_RPC_URL;
	}

	/**
	 * Gets the singleton instance of L2InfoService
	 */
	public static getInstance(): L2InfoService {
		if (!L2InfoService.instance) {
			L2InfoService.instance = new L2InfoService();
		}
		return L2InfoService.instance;
	}

	/**
	 * Initialize the service with custom RPC URL if provided
	 */
	public async init(rpcUrl?: string): Promise<void> {
		if (this.initialized) return; // Already initialized

		try {
			// If AZTEC_NODE_URL is available in env, use it instead of default
			this.rpcUrl =
				rpcUrl || process.env.AZTEC_NODE_URL || DEFAULT_RPC_URL;
			this.initialized = true;
			logger.info(
				`L2InfoService initialized with RPC URL: ${this.rpcUrl}`
			);
		} catch (error) {
			logger.error(error, "Failed to initialize L2InfoService");
			throw error;
		}
	}

	/**
	 * Get the latest L2 block tips
	 * @returns The proven block number as a string
	 */
	public async getL2Tips(): Promise<string> {
		try {
			// Initialize if not already done
			if (!this.initialized) {
				await this.init();
			}
			
			const result = await sendJsonRpcRequest(this.rpcUrl, "node_getL2Tips");
			return result.proven.number as string;
		} catch (error) {
			logger.error(error, "Error getting L2 tips:");
			throw error;
		}
	}

	/**
	 * Get archive sibling path for a block
	 * @param blockNumber The block number to get the path for
	 * @returns The archive sibling path
	 */
	public async getArchiveSiblingPath(blockNumber: string): Promise<any> {
		try {
			// Initialize if not already done
			if (!this.initialized) {
				await this.init();
			}
			
			// Assuming the RPC method takes blockNumber as a parameter.
			// The previous version passed it twice, let's try with one first.
			return await sendJsonRpcRequest(this.rpcUrl, "node_getArchiveSiblingPath", [
				blockNumber,
				blockNumber,
			]);
		} catch (error) {
			logger.error(
				error,
				`Error getting archive sibling path for block ${blockNumber}:`,
			);
			throw error;
		}
	}

	/**
	 * Verifies if a provided proof is valid for a given block number
	 * @param blockNumber The block number to check
	 * @param proof The proof string to validate
	 * @returns True if proof is valid, false otherwise
	 */
	public async proveSynced(blockNumber: string, proof: string): Promise<boolean> {
		if (process.env.BYPASS_SYNC_CHECK === "true") {
			// logger.info("Sync check bypassed via environment variable.");
			return true;
		}

		const tip = await this.getL2Tips();
		if (Number(tip) > Number(blockNumber) + 100) {
			// Adding a specific log message for this condition
			logger.warn(`Proof is too old for block ${blockNumber}. Current tip: ${tip}`);
			throw new Error("Proof is too old");
		}

		const rpcProof = await this.getArchiveSiblingPath(blockNumber);
		if (rpcProof === proof) {
			return true;
		} else {
			// Adding a log message for failed proof verification
			logger.warn(`Proof mismatch for block ${blockNumber}. Expected: ${rpcProof}, Got: ${proof}`);
			return false;
		}
	}

	/**
	 * Fetches raw validator stats from RPC
	 * @returns Raw validator stats response
	 */
	private async fetchRawValidatorStats(): Promise<ValidatorsStatsResponse> {
		try {
			// Initialize if not already done
			if (!this.initialized) {
				await this.init();
			}
			
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
	 * Helper method to process individual validator stats
	 */
	private processValidatorStats(address: string, validatorStats: any): RpcAttestationResult {
		const lastAttestation = validatorStats.lastAttestation;
		const lastProposal = validatorStats.lastProposal;
		let hasAttested24h = false;
		let lastAttestationTimestampBigInt: bigint | undefined = undefined;
		let lastProposalTimestampBigInt: bigint | undefined = undefined;
		let lastProposalSlotBigInt: bigint | undefined = undefined;
		let lastProposalDate: string | undefined = undefined;

		if (lastAttestation) {
			try {
				lastAttestationTimestampBigInt = BigInt(
					lastAttestation.timestamp
				);
				const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
				const twentyFourHoursAgoSeconds =
					nowSeconds - BigInt(24 * 60 * 60);

				if (
					lastAttestationTimestampBigInt >=
					twentyFourHoursAgoSeconds
				) {
					hasAttested24h = true;
				}
			} catch (e) {
				logger.error(e, "Error converting attestation timestamp to BigInt");
			}
		}

		if (lastProposal) {
			try {
				lastProposalTimestampBigInt = BigInt(
					lastProposal.timestamp
				);
				lastProposalSlotBigInt = BigInt(lastProposal.slot);
				lastProposalDate = lastProposal.date;
			} catch (e) {
				logger.error(e, "Error converting proposal timestamp/slot to BigInt");
			}
		}

		return {
			hasAttested24h,
			lastAttestationSlot: lastAttestation
				? BigInt(lastAttestation.slot)
				: undefined,
			lastAttestationTimestamp: lastAttestationTimestampBigInt,
			lastAttestationDate: lastAttestation?.date,
			lastProposalSlot: lastProposalSlotBigInt,
			lastProposalTimestamp: lastProposalTimestampBigInt,
			lastProposalDate: lastProposalDate,
			missedAttestationsCount:
				validatorStats.missedAttestations?.count,
			missedProposalsCount: validatorStats.missedProposals?.count,
			totalSlots: validatorStats.totalSlots,
			error: undefined, // No error if we got this far
		};
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
			const maxPages = 50; // Safety limit to prevent infinite loops

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
				
				logger.info(`Fetched page ${pageCount} with ${data.peers?.length || 0} peers (total so far: ${allPeers.length})`);
				
				// Safety check to prevent infinite loops
				if (pageCount >= maxPages) {
					logger.warn(`Reached maximum page limit (${maxPages}) while fetching peer data`);
					break;
				}
				
			} while (nextPaginationToken);

			logger.info(`Completed peer data fetch: ${pageCount} pages, ${allPeers.length} total peers`);

			// Return in the same format as the original response
			return {
				peers: allPeers
			};
		} catch (error) {
			logger.error(error, "Error fetching peer network data");
			throw error;
		}
	}

	/**
	 * Get the current validator network statistics
	 */
	public getValidatorStats(): ValidatorNetworkStats | null {
		return this.validatorStats;
	}

	/**
	 * Main method to check epoch and update validator data if needed
	 * @returns Number of validators updated (0 if no update needed)
	 */
	public async updateValidatorDataIfNeeded(): Promise<number> {
		try {
			// Get Ethereum instance to check current epoch and validator set
			const ethereum = await getEthereumInstance();
			const rollupInfo = await ethereum.getRollupInfo();
			const currentEpochNumber = Number(rollupInfo.currentEpoch);
			
			// Check if we need to update for this epoch
			if (this.lastUpdatedEpoch === currentEpochNumber) {
				logger.debug(`Data already updated for epoch ${currentEpochNumber}`);
				return 0;
			}

			logger.info(`Epoch changed from ${this.lastUpdatedEpoch} to ${currentEpochNumber}, updating validator data`);

			// Import validator service here to avoid circular dependencies
			const { validatorService } = await import("@sparta/api/src/domain/validators/service");

			// Step 1: Sync L1 validator data (blockchain validator set)
			const l1ValidatorCount = await this.syncL1ValidatorData(rollupInfo.validators, validatorService);

			// Step 2: Get all validators from database for L2 and peer data sync
			let allValidators: string[] = [];
			let nextPageToken: string | undefined = undefined;
			
			do {
				const result = await validatorService.getAllValidators(nextPageToken);
				allValidators = allValidators.concat(result.validators.map(v => v.validatorAddress));
				nextPageToken = result.nextPageToken;
			} while (nextPageToken);

			// Step 3: Sync L2 validator data (Aztec RPC stats)
			const l2Stats = await this.syncL2ValidatorDataAndGetStats(allValidators, currentEpochNumber, validatorService);

			// Step 4: Sync peer data (crawler info)
			const peerStats = await this.syncPeerDataAndGetStats(validatorService);

			// Step 5: Calculate comprehensive network statistics
			this.validatorStats = this.calculateNetworkStats(
				rollupInfo,
				l2Stats,
				peerStats,
				currentEpochNumber
			);

			// Mark this epoch as updated
			this.lastUpdatedEpoch = currentEpochNumber;

			logger.info(
				{ 
					epoch: currentEpochNumber,
					l1Updates: l1ValidatorCount,
					l2Updates: l2Stats.updateCount,
					peerUpdates: peerStats.updateCount,
					totalValidators: allValidators.length,
					stats: this.validatorStats
				},
				"Validator data update completed"
			);

			return l2Stats.updateCount;
		} catch (error) {
			logger.error(error, "Error updating validator data");
			throw error;
		}
	}

	/**
	 * Sync L1 validator data from blockchain
	 * @param blockchainValidators Current validator set from rollup contract
	 * @param validatorService Validator service instance
	 * @returns Number of validators ensured in database
	 */
	private async syncL1ValidatorData(
		blockchainValidators: string[],
		validatorService: any
	): Promise<number> {
		try {
			logger.info(`Syncing L1 data: ensuring ${blockchainValidators.length} blockchain validators exist in database`);
			
			const ensurePromises = blockchainValidators.map(address => 
				validatorService.ensureValidatorExists(address)
			);
			const results = await Promise.allSettled(ensurePromises);
			
			const successCount = results.filter(r => r.status === 'fulfilled').length;
			const failureCount = results.length - successCount;
			
			if (failureCount > 0) {
				logger.warn(`Failed to ensure ${failureCount} validators exist in database`);
			}
			
			logger.info(`L1 sync completed: ${successCount} validators ensured in database`);
			return successCount;
		} catch (error) {
			logger.error(error, "Error syncing L1 validator data");
			throw error;
		}
	}

	/**
	 * Sync L2 validator data from Aztec RPC
	 * @param validatorAddresses All validator addresses to sync
	 * @param currentEpoch Current epoch number
	 * @param validatorService Validator service instance
	 * @returns Number of validators updated and statistics
	 */
	private async syncL2ValidatorDataAndGetStats(
		validatorAddresses: string[],
		currentEpoch: number,
		validatorService: any
	): Promise<{ 
		updateCount: number; 
		rawStats: ValidatorsStatsResponse;
		validatorsAttested24h: number;
		validatorsProposed24h: number;
		totalAttestationMissRate: number;
		totalProposalMissRate: number;
	}> {
		try {
			logger.info(`Syncing L2 data: processing stats for ${validatorAddresses.length} validators`);
			
			// Fetch raw validator stats from Aztec RPC
			const rawValidatorStats = await this.fetchRawValidatorStats();
			
			// Process stats for each validator
			const statsUpdates: Array<{ validatorAddress: string; statsData: any }> = [];
			let validatorsAttested24h = 0;
			let validatorsProposed24h = 0;
			let totalAttestationMissRate = 0;
			let totalProposalMissRate = 0;
			let validatorsWithStats = 0;
			
			for (const validatorAddress of validatorAddresses) {
				const lowerCaseAddress = validatorAddress.toLowerCase();
				const rawStats = rawValidatorStats.stats[lowerCaseAddress];
				
				let statsData: any;
				
				if (!rawStats) {
					logger.debug(`No RPC stats found for validator ${validatorAddress}, using default values`);
					
					// Provide default values for validators without RPC stats
					statsData = {
						epoch: currentEpoch,
						hasAttested24h: false,
						lastAttestationSlot: null,
						lastAttestationTimestamp: null,
						lastAttestationDate: null,
						lastProposalSlot: null,
						lastProposalTimestamp: null,
						lastProposalDate: null,
						missedAttestationsCount: 0,
						missedProposalsCount: 0,
						totalSlots: 0,
					};
				} else {
					// Process the raw stats
					const processedStats = this.processValidatorStats(lowerCaseAddress, rawStats);
					
					// Count validators who attested/proposed in 24h
					if (processedStats.hasAttested24h) {
						validatorsAttested24h++;
					}
					
					// Check if proposed in last 24h
					if (processedStats.lastProposalTimestamp) {
						const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
						const twentyFourHoursAgoSeconds = nowSeconds - BigInt(24 * 60 * 60);
						if (processedStats.lastProposalTimestamp >= twentyFourHoursAgoSeconds) {
							validatorsProposed24h++;
						}
					}
					
					// Calculate miss rates
					if (rawStats.missedAttestations && typeof rawStats.missedAttestations.rate === 'number') {
						totalAttestationMissRate += rawStats.missedAttestations.rate;
						validatorsWithStats++;
					}
					if (rawStats.missedProposals && typeof rawStats.missedProposals.rate === 'number') {
						totalProposalMissRate += rawStats.missedProposals.rate;
					}
					
					// Convert to database format (BigInt to string for storage)
					statsData = {
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
				}
				
				statsUpdates.push({ validatorAddress, statsData });
			}
			
			// Batch update validator stats
			const updateCount = await validatorService.batchUpdateValidatorStats(statsUpdates);
			
			// Calculate average miss rates
			const avgAttestationMissRate = validatorsWithStats > 0 ? totalAttestationMissRate / validatorsWithStats : 0;
			const avgProposalMissRate = validatorsWithStats > 0 ? totalProposalMissRate / validatorsWithStats : 0;
			
			logger.info(`L2 sync completed: updated stats for ${updateCount} validators`);
			
			return {
				updateCount,
				rawStats: rawValidatorStats,
				validatorsAttested24h,
				validatorsProposed24h,
				totalAttestationMissRate: avgAttestationMissRate,
				totalProposalMissRate: avgProposalMissRate
			};
		} catch (error) {
			logger.error(error, "Error syncing L2 validator data");
			throw error;
		}
	}

	/**
	 * Sync peer data from crawler
	 * @param validatorService Validator service instance
	 * @returns Number of validators updated with peer data and statistics
	 */
	private async syncPeerDataAndGetStats(validatorService: any): Promise<{
		updateCount: number;
		totalPeers: number;
		countryDistribution: Record<string, number>;
		clientDistribution: Record<string, number>;
		ispDistribution: Record<string, number>;
		validatorsWithPeers: number;
		peerDataMap: Map<string, PeerData>;
	}> {
		try {
			logger.info("Syncing peer data from crawler");
			
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
			
			// Initialize stats
			const countryDistribution: Record<string, number> = {};
			const clientDistribution: Record<string, number> = {};
			const ispDistribution: Record<string, number> = {};
			
			// Fetch peer data from crawler
			const peerNetworkResponse = await this.fetchPeerNetworkData();
			const peerDataMap = new Map<string, PeerData>();
			
			// Process all peers for statistics
			for (const peer of peerNetworkResponse.peers) {
				peerDataMap.set(peer.id, peer);
				
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
			
			// Process peer data updates for validators
			const peerUpdates: Array<{ validatorAddress: string; statsData: any }> = [];
			
			for (const { validatorAddress, peerId } of validatorsWithPeers) {
				const peerData = peerDataMap.get(peerId);
				if (!peerData) {
					logger.debug(`No peer data found for validator ${validatorAddress} with peerId ${peerId}`);
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
			
			// Batch update peer data
			const updateCount = await validatorService.batchUpdateValidatorStats(peerUpdates);
			
			logger.info(`Peer sync completed: updated peer data for ${updateCount} validators`);
			
			return {
				updateCount,
				totalPeers: peerNetworkResponse.peers.length,
				countryDistribution,
				clientDistribution,
				ispDistribution,
				validatorsWithPeers: validatorsWithPeers.length,
				peerDataMap
			};
		} catch (error) {
			logger.error(error, "Error syncing peer data");
			throw error;
		}
	}

	/**
	 * Calculate comprehensive network statistics from all data sources
	 */
	private calculateNetworkStats(
		rollupInfo: any,
		l2Stats: any,
		peerStats: any,
		currentEpoch: number
	): ValidatorNetworkStats {
		// Find top country
		let topCountry: { country: string; count: number } | null = null;
		for (const [country, count] of Object.entries(peerStats.countryDistribution)) {
			if (!topCountry || (count as number) > topCountry.count) {
				topCountry = { country, count: count as number };
			}
		}
		
		// Find top ISP
		let topISP: { isp: string; count: number } | null = null;
		for (const [isp, count] of Object.entries(peerStats.ispDistribution)) {
			if (!topISP || (count as number) > topISP.count) {
				topISP = { isp, count: count as number };
			}
		}
		
		// Find top 3 countries
		const top3Countries: Array<{ country: string; count: number }> = [];
		const countryEntries = Object.entries(peerStats.countryDistribution);
		
		// Sort countries by count in descending order and take top 3
		const sortedCountries = countryEntries
			.map(([country, count]) => ({ country, count: count as number }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 3);
		
		top3Countries.push(...sortedCountries);
		
		return {
			// Basic counts
			totalValidatorsInSet: rollupInfo.validators.length,
			activeValidators: l2Stats.validatorsAttested24h,
			totalPeersInNetwork: peerStats.totalPeers,
			
			// Performance metrics
			networkAttestationMissRate: l2Stats.totalAttestationMissRate,
			networkProposalMissRate: l2Stats.totalProposalMissRate,
			
			// Geographic distribution
			countryDistribution: peerStats.countryDistribution,
			topCountry,
			top3Countries,
			
			// Client distribution
			clientDistribution: peerStats.clientDistribution,
			
			// ISP distribution
			ispDistribution: peerStats.ispDistribution,
			topISP,
			
			// Activity metrics
			validatorsAttested24h: l2Stats.validatorsAttested24h,
			validatorsProposed24h: l2Stats.validatorsProposed24h,
			
			// Network health
			validatorsWithPeers: peerStats.validatorsWithPeers,
			
			// Timing
			lastUpdated: Date.now(),
			currentEpoch: currentEpoch,
			currentSlot: Number(rollupInfo.currentSlot),
		};
	}
}

// Export a singleton instance
export const l2InfoService = L2InfoService.getInstance();

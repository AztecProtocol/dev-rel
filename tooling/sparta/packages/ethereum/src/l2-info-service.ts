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
	missedProposals: { count: number };
	missedAttestations: { count: number };
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
 * Service for retrieving L2 blockchain information and validator data via RPC
 */
export class L2InfoService {
	private static instance: L2InfoService | null = null;
	private rpcUrl: string;
	private initialized: boolean = false;
	
	// Track the last epoch we updated the database for
	private lastUpdatedEpoch: number | null = null;

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
	 * Main method to check epoch and update validator data if needed
	 * @param currentEpoch Current epoch number
	 * @returns Number of validators updated (0 if no update needed)
	 */
	public async updateValidatorDataIfNeeded(): Promise<number> {
		try {
			// Get Ethereum instance
			const ethereum = await getEthereumInstance();
			
			// Get chain info directly
			const {
				currentEpoch: currentEpochNumber,
			} = await ethereum.getRollupInfo();
			
			// Check if we need to update for this epoch
			if (this.lastUpdatedEpoch === Number(currentEpochNumber)) {
				logger.debug(`Data already updated for epoch ${currentEpochNumber}`);
				return 0;
			} else {
				logger.info(`Epoch changed from ${this.lastUpdatedEpoch} to ${currentEpochNumber}, updating validator data`);

				// Get list of known validators from database to ensure we process all of them
				const { validatorService } = await import("@sparta/api/src/domain/validators/service");
				let allKnownValidators: string[] = [];
				let nextPageToken: string | undefined = undefined;
				
				do {
					const result = await validatorService.getAllValidators(nextPageToken);
					allKnownValidators = allKnownValidators.concat(result.validators.map(v => v.validatorAddress));
					nextPageToken = result.nextPageToken;
				} while (nextPageToken);

				logger.info(`Found ${allKnownValidators.length} known validators in database to process`);

				// Grab fresh data from RPC and process it for all known validators
				const processedStatsData = await this.processValidatorStatsForEpoch(Number(currentEpochNumber), allKnownValidators);

				if (processedStatsData.length === 0) {
					logger.warn("No validator stats data to update");
					return 0;
				}

				// Update validator stats in database
				const statsUpdates = processedStatsData.map(({ validatorAddress, statsData }) => ({
					validatorAddress,
					statsData
				}));

				const statsUpdatedCount = await validatorService.batchUpdateValidatorStats(statsUpdates);

				// Process and update peer data for validators that have peer IDs
				const validatorPeerMappings: Array<{ validatorAddress: string; peerId?: string }> = [];
				
				for (const { validatorAddress } of processedStatsData) {
					const validator = await validatorService.getValidatorByAddress(validatorAddress);
					if (validator?.peerId) {
						validatorPeerMappings.push({
							validatorAddress: validator.validatorAddress,
							peerId: validator.peerId
						});
					}
				}

				let peerDataUpdated = 0;
				if (validatorPeerMappings.length > 0) {
					const processedPeerData = await this.processPeerDataForValidators(validatorPeerMappings);
					
					if (processedPeerData.length > 0) {
						const peerUpdates = processedPeerData.map(({ validatorAddress, peerData }) => ({
							validatorAddress,
							statsData: peerData
						}));
						
						peerDataUpdated = await validatorService.batchUpdateValidatorStats(peerUpdates);
					}
				}
				
				// Mark this epoch as updated
				this.lastUpdatedEpoch = Number(currentEpochNumber);

				logger.info(
					{ 
						epoch: currentEpochNumber, 
						statsUpdated: statsUpdatedCount, 
						peerDataUpdated,
						totalProcessed: processedStatsData.length
					},
					"Validator data update completed"
				);

				return statsUpdatedCount;
			}
		} catch (error) {
			logger.error(error, "Error updating validator data");
			throw error;
		}
	}

	/**
	 * Processes validator stats for epoch-based database storage
	 * @param currentEpoch Current epoch number
	 * @param knownValidators Optional list of known validator addresses to limit processing
	 * @returns Processed stats data ready for database storage
	 */
	private async processValidatorStatsForEpoch(
		currentEpoch: number,
		knownValidators?: string[]
	): Promise<Array<{ validatorAddress: string; statsData: any }>> {
		try {
			logger.info(`Processing validator stats for epoch ${currentEpoch}`);

			// Fetch raw data from RPC
			const rawValidatorStats = await this.fetchRawValidatorStats();

			// Prepare processed data for validators
			const processedData: Array<{ validatorAddress: string; statsData: any }> = [];

			// Get validators to process (either known validators or all from RPC)
			const validatorsToProcess = knownValidators || Object.keys(rawValidatorStats.stats);

			for (const validatorAddress of validatorsToProcess) {
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

				processedData.push({ validatorAddress, statsData });
			}

			logger.info(
				{ epoch: currentEpoch, total: processedData.length },
				"Completed validator stats processing"
			);

			return processedData;
		} catch (error) {
			logger.error(error, "Error processing validator stats");
			throw error;
		}
	}

	/**
	 * Process peer data for validators with peer IDs
	 * @param validatorPeerMappings Array of {validatorAddress, peerId} objects
	 * @returns Processed peer data for database storage
	 */
	private async processPeerDataForValidators(
		validatorPeerMappings: Array<{ validatorAddress: string; peerId?: string }>
	): Promise<Array<{ validatorAddress: string; peerData: any }>> {
		try {
			// Fetch fresh peer data
			const peerNetworkResponse = await this.fetchPeerNetworkData();
			const peerDataMap = new Map<string, PeerData>();
			for (const peer of peerNetworkResponse.peers) {
				peerDataMap.set(peer.id, peer);
			}

			const processedPeerData: Array<{ validatorAddress: string; peerData: any }> = [];

			for (const mapping of validatorPeerMappings) {
				if (!mapping.peerId) continue;

				const peerData = peerDataMap.get(mapping.peerId);
				if (!peerData) continue;

				const firstMultiAddr = peerData.multi_addresses?.[0];
				const firstIpInfo = firstMultiAddr?.ip_info?.[0];

				const processedData = {
					peerClient: peerData.client,
					peerCountry: firstIpInfo?.country_name,
					peerCity: firstIpInfo?.city_name,
					peerIpAddress: firstIpInfo?.ip_address,
					peerPort: firstIpInfo?.port,
					peerIsSynced: peerData.is_synced,
					peerBlockHeight: peerData.block_height,
					peerLastSeen: peerData.last_seen,
				};

				processedPeerData.push({ 
					validatorAddress: mapping.validatorAddress, 
					peerData: processedData 
				});
			}

			return processedPeerData;
		} catch (error) {
			logger.error(error, "Error processing peer data for validators");
			throw error;
		}
	}
}

// Export a singleton instance
export const l2InfoService = L2InfoService.getInstance();

/**
 * @fileoverview L2 Information service for blockchain data via JSON-RPC
 * @description Provides methods for retrieving L2 blockchain state and validator information
 * @module sparta/discord/services
 */

import { logger, sendJsonRpcRequest } from "@sparta/utils";

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
	
	// Cache for validator stats (refreshed every epoch)
	private validatorStatsCache: Record<string, RpcAttestationResult> | null = null;
	private cachedEpoch: bigint | null = null;

	// Cache for peer network data (refreshed every 10 epochs)
	private peerNetworkCache: PeerNetworkSummary | null = null;
	private peerDataMapCache: Map<string, PeerData> | null = null;
	private peerCacheEpoch: bigint | null = null;
	private readonly PEER_CACHE_EPOCH_INTERVAL = 10n; // Cache peer data every 10 epochs

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
	 * Fetches validator stats via RPC and checks recent attestation.
	 * @param targetAddress Optional Ethereum address to check (lowercase expected by RPC). If not provided, returns stats for all validators.
	 * @returns Attestation status with details from RPC - single validator stats if targetAddress provided, all validator stats if not
	 */
	public async fetchValidatorStats(
		targetAddress?: string
	): Promise<RpcAttestationResult | Record<string, RpcAttestationResult>> {
		try {
			// Initialize if not already done
			if (!this.initialized) {
				await this.init();
			}
			
			const data = (await sendJsonRpcRequest(
				this.rpcUrl,
				RPC_METHOD_VALIDATOR_STATS,
				[]
			)) as ValidatorsStatsResponse;

			// If no target address specified, process and return all validator stats
			if (!targetAddress) {
				const allValidatorStats: Record<string, RpcAttestationResult> = {};
				
				for (const [address, validatorStats] of Object.entries(data.stats)) {
					allValidatorStats[address] = this.processValidatorStats(address, validatorStats);
				}
				
				return allValidatorStats;
			}

			// Process single validator (existing behavior)
			const lowerCaseAddress = targetAddress.toLowerCase();
			const validatorStats = data.stats[lowerCaseAddress];

			if (!validatorStats) {
				return {
					hasAttested24h: false,
					error: `Validator ${targetAddress} not found in node stats.`,
				};
			}

			return this.processValidatorStats(lowerCaseAddress, validatorStats);
		} catch (error) {
			logger.error(error, "Error fetching or processing validator stats via RPC");
			
			// Return error result - single validator format if targetAddress provided, empty object if not
			const errorResult = {
				hasAttested24h: false,
				error:
					error instanceof Error
						? error.message
						: "Unknown error during RPC fetch",
				lastAttestationSlot: undefined,
				lastAttestationTimestamp: undefined,
				lastAttestationDate: undefined,
				lastProposalSlot: undefined,
				lastProposalTimestamp: undefined,
				lastProposalDate: undefined,
				missedAttestationsCount: undefined,
				missedProposalsCount: undefined,
				totalSlots: undefined,
			};
			
			return targetAddress ? errorResult : {};
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
	 * Fetches validator stats with epoch-based caching. Only refetches if the current epoch 
	 * is different from the cached epoch.
	 * @param currentEpoch The current epoch from rollup info
	 * @returns All validator stats from cache or fresh fetch
	 */
	public async fetchValidatorStatsWithCache(
		currentEpoch: bigint
	): Promise<Record<string, RpcAttestationResult>> {
		try {
			// Check if we have cached data and the epoch hasn't changed
			if (this.validatorStatsCache && this.cachedEpoch === currentEpoch) {
				logger.info(`Using cached validator stats for epoch ${currentEpoch}`);
				return this.validatorStatsCache;
			}

			// Epoch changed or no cache exists, fetch fresh data
			logger.info(`Fetching fresh validator stats for epoch ${currentEpoch} (previous: ${this.cachedEpoch})`);
			
			const freshStats = await this.fetchValidatorStats() as Record<string, RpcAttestationResult>;
			
			// Update cache
			this.validatorStatsCache = freshStats;
			this.cachedEpoch = currentEpoch;
			
			return freshStats;
		} catch (error) {
			logger.error(error, "Error fetching validator stats with cache");
			// If we have cached data, return it even if fetch failed
			if (this.validatorStatsCache) {
				logger.warn(`Returning stale cached data for epoch ${this.cachedEpoch} due to fetch error`);
				return this.validatorStatsCache;
			}
			// No cache and fetch failed, return empty object
			return {};
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
	 * Processes raw peer data into a summary for efficient caching
	 */
	private processPeerData(peerData: PeerData[]): PeerNetworkSummary {
		const clientDistribution: Record<string, number> = {};
		const countryDistribution: Record<string, number> = {};
		let syncedCount = 0;
		let totalBlockHeight = 0;
		let blockHeightCount = 0;

		for (const peer of peerData) {
			// Count by client type
			clientDistribution[peer.client] = (clientDistribution[peer.client] || 0) + 1;

			// Count by country (from first IP info if available)
			const firstMultiAddr = peer.multi_addresses?.[0];
			const firstIpInfo = firstMultiAddr?.ip_info?.[0];
			if (firstIpInfo?.country_name) {
				const country = firstIpInfo.country_name;
				countryDistribution[country] = (countryDistribution[country] || 0) + 1;
			}

			// Count synced peers
			if (peer.is_synced === true) {
				syncedCount++;
			}

			// Calculate average block height
			if (peer.block_height !== null && peer.block_height !== undefined) {
				totalBlockHeight += peer.block_height;
				blockHeightCount++;
			}
		}

		// Take a sample of recent peers for display
		const samplePeers = peerData
			.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
			.slice(0, 10); // Top 10 most recently seen

		return {
			totalPeers: peerData.length,
			syncedPeers: syncedCount,
			clientDistribution,
			countryDistribution,
			avgBlockHeight: blockHeightCount > 0 ? Math.round(totalBlockHeight / blockHeightCount) : undefined,
			lastUpdated: Date.now(),
			samplePeers,
		};
	}

	/**
	 * Combines validator stats and peer data with separate caching intervals
	 * Validator stats: refreshed every epoch
	 * Peer data: refreshed every 10 epochs
	 */
	public async fetchCombinedNetworkData(
		currentEpoch: bigint
	): Promise<{ validatorStats: Record<string, RpcAttestationResult>; peerNetwork: PeerNetworkSummary; peerDataMap: Map<string, PeerData> }> {
		try {
			let needsValidatorStats = false;
			let needsPeerData = false;

			// Check if validator stats need refresh (every epoch)
			if (!this.validatorStatsCache || this.cachedEpoch !== currentEpoch) {
				needsValidatorStats = true;
			}

			// Check if peer data needs refresh (every 10 epochs)
			const peerCacheEpoch = currentEpoch - (currentEpoch % this.PEER_CACHE_EPOCH_INTERVAL);
			if (!this.peerNetworkCache || this.peerCacheEpoch !== peerCacheEpoch) {
				needsPeerData = true;
			}

			// If nothing needs refresh, return cached data
			if (!needsValidatorStats && !needsPeerData) {
				logger.info(`Using cached data - validator stats epoch ${this.cachedEpoch}, peer data epoch ${this.peerCacheEpoch}`);
				return {
					validatorStats: this.validatorStatsCache!,
					peerNetwork: this.peerNetworkCache!,
					peerDataMap: this.peerDataMapCache || new Map(),
				};
			}

			// Build array of fetch promises based on what needs refresh
			const fetchPromises: Promise<any>[] = [];
			let validatorPromiseIndex = -1;
			let peerPromiseIndex = -1;

			if (needsValidatorStats) {
				validatorPromiseIndex = fetchPromises.length;
				fetchPromises.push(this.fetchValidatorStats());
				logger.info(`Fetching fresh validator stats for epoch ${currentEpoch} (previous: ${this.cachedEpoch})`);
			}

			if (needsPeerData) {
				peerPromiseIndex = fetchPromises.length;
				fetchPromises.push(this.fetchPeerNetworkData());
				logger.info(`Fetching fresh peer data for cache epoch ${peerCacheEpoch} (previous: ${this.peerCacheEpoch})`);
			}

			// Fetch data as needed
			const results = await Promise.all(fetchPromises);

			// Update caches based on what was fetched
			if (needsValidatorStats && validatorPromiseIndex >= 0) {
				const validatorStats = results[validatorPromiseIndex] as Record<string, RpcAttestationResult>;
				this.validatorStatsCache = validatorStats;
				this.cachedEpoch = currentEpoch;
			}

			if (needsPeerData && peerPromiseIndex >= 0) {
				const peerNetworkResponse = results[peerPromiseIndex] as PeerCrawlerResponse;
				const peerNetworkSummary = this.processPeerData(peerNetworkResponse.peers);
				
				// Create peer data map for quick lookup
				const peerDataMap = new Map<string, PeerData>();
				for (const peer of peerNetworkResponse.peers) {
					peerDataMap.set(peer.id, peer);
				}

				this.peerNetworkCache = peerNetworkSummary;
				this.peerDataMapCache = peerDataMap;
				this.peerCacheEpoch = peerCacheEpoch;
			}

			// Return combined data
			return {
				validatorStats: this.validatorStatsCache!,
				peerNetwork: this.peerNetworkCache!,
				peerDataMap: this.peerDataMapCache || new Map(),
			};
		} catch (error) {
			logger.error(error, "Error fetching combined network data");
			// If we have any cached data, return it even if fetch failed
			if (this.validatorStatsCache || this.peerNetworkCache) {
				logger.warn(`Returning stale cached data due to fetch error`);
				return {
					validatorStats: this.validatorStatsCache || {},
					peerNetwork: this.peerNetworkCache || {
						totalPeers: 0,
						syncedPeers: 0,
						clientDistribution: {},
						countryDistribution: {},
						lastUpdated: Date.now(),
						samplePeers: [],
					},
					peerDataMap: this.peerDataMapCache || new Map(),
				};
			}
			// No cache and fetch failed, return empty data
			return {
				validatorStats: {},
				peerNetwork: {
					totalPeers: 0,
					syncedPeers: 0,
					clientDistribution: {},
					countryDistribution: {},
					lastUpdated: Date.now(),
					samplePeers: [],
				},
				peerDataMap: new Map(),
			};
		}
	}

	/**
	 * Enriches validator data with specific peer information based on peerId
	 * @param validators Array of validators with optional peerIds
	 * @param currentEpoch Current epoch for validator stats
	 * @returns Enriched validator data with peer information
	 */
	public async fetchEnrichedValidatorData(
		validators: Array<{ validatorAddress: string; peerId?: string }>,
		currentEpoch: bigint
	): Promise<Array<{
		validatorAddress: string;
		validatorStats?: RpcAttestationResult;
		peerData?: PeerData;
		peerId?: string;
	}>> {
		try {
			// Fetch both data sources using the new separate caching
			const networkData = await this.fetchCombinedNetworkData(currentEpoch);
			const validatorStats = networkData.validatorStats;
			const peerDataMap = networkData.peerDataMap;

			// Enrich each validator with its data
			return validators.map(validator => {
				const validatorStatsData = validatorStats[validator.validatorAddress.toLowerCase()];
				const peerData = validator.peerId ? peerDataMap.get(validator.peerId) : undefined;

				return {
					validatorAddress: validator.validatorAddress,
					validatorStats: validatorStatsData,
					peerData,
					peerId: validator.peerId,
				};
			});
		} catch (error) {
			logger.error(error, "Error fetching enriched validator data");
			// Return basic structure on error
			return validators.map(validator => ({
				validatorAddress: validator.validatorAddress,
				peerId: validator.peerId,
			}));
		}
	}
}

// Export a singleton instance
export const l2InfoService = L2InfoService.getInstance();

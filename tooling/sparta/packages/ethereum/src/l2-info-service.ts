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
	history: [{ slot: string, status: string }]; // Assuming history is not directly needed for this check
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
 * This service now calculates network statistics from database data
 * (data sync is handled by EpochSyncService)
 */
export class L2InfoService {
	private static instance: L2InfoService | null = null;
	private initialized: boolean = false;
	
	// In-memory validator statistics
	private validatorStats: ValidatorNetworkStats | null = null;
	private lastCalculatedEpoch: number | null = null;

	private constructor() {}

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
	 * Initialize the service
	 */
	public async init(): Promise<void> {
		if (this.initialized) return; // Already initialized

		try {
			this.initialized = true;
			logger.info("L2InfoService initialized");
		} catch (error) {
			logger.error(error, "Failed to initialize L2InfoService");
			throw error;
		}
	}

	/**
	 * Get the current validator network statistics
	 * Calculates from database if not cached or if epoch has changed
	 */
	public async getValidatorStats(): Promise<ValidatorNetworkStats | null> {
		try {
			// Get current epoch
			const ethereum = await getEthereumInstance();
			const rollupInfo = await ethereum.getRollupInfo();
			const currentEpoch = Number(rollupInfo.currentEpoch);

			// Check if we need to recalculate
			if (this.lastCalculatedEpoch === currentEpoch && this.validatorStats) {
				return this.validatorStats;
			}

			// Calculate fresh stats from database
			await this.calculateNetworkStatsFromDatabase(currentEpoch, rollupInfo);
			this.lastCalculatedEpoch = currentEpoch;

			return this.validatorStats;
		} catch (error) {
			logger.error(error, "Error getting validator stats");
			return null;
		}
	}

	/**
	 * Calculate network statistics from database data
	 */
	private async calculateNetworkStatsFromDatabase(currentEpoch: number, rollupInfo: any): Promise<void> {
		try {
			// Import repositories dynamically to avoid circular dependencies
			const { networkStatsRepository } = await import("@sparta/api/src/db/networkStatsRepository");

			// Get the latest network stats from database (stored by EpochSyncService)
			const latestNetworkStats = await networkStatsRepository.findLatest();

			if (latestNetworkStats && latestNetworkStats.epochNumber === currentEpoch) {
				// We have current epoch stats, use them directly
				this.validatorStats = {
					// Basic counts
					totalValidatorsInSet: latestNetworkStats.totalValidatorsInSet,
					activeValidators: latestNetworkStats.activeValidators,
					totalPeersInNetwork: latestNetworkStats.totalPeersInNetwork,
					
					// Performance metrics
					networkAttestationMissRate: latestNetworkStats.networkAttestationMissRate,
					networkProposalMissRate: latestNetworkStats.networkProposalMissRate,
					
					// Geographic distribution
					countryDistribution: latestNetworkStats.countryDistribution,
					topCountry: latestNetworkStats.topCountry || null,
					top3Countries: latestNetworkStats.top3Countries,
					
					// Client distribution
					clientDistribution: latestNetworkStats.clientDistribution,
					
					// ISP distribution
					ispDistribution: latestNetworkStats.ispDistribution,
					topISP: latestNetworkStats.topISP || null,
					
					// Activity metrics
					validatorsAttested24h: latestNetworkStats.validatorsAttested24h,
					validatorsProposed24h: latestNetworkStats.validatorsProposed24h,
					
					// Network health
					validatorsWithPeers: latestNetworkStats.validatorsWithPeers,
					
					// Timing
					lastUpdated: latestNetworkStats.timestamp,
					currentEpoch: latestNetworkStats.epochNumber,
					currentSlot: latestNetworkStats.currentSlot,
				};
				
				logger.info(
					{ epochNumber: currentEpoch, timestamp: latestNetworkStats.timestamp },
					"Using cached network stats from database"
				);
			} else {
				// No current stats available, log warning
				logger.warn(
					{ 
						currentEpoch, 
						latestStatsEpoch: latestNetworkStats?.epochNumber,
						latestStatsTimestamp: latestNetworkStats?.timestamp 
					},
					"No current network stats available in database"
				);
				
				// Return empty stats structure
				this.validatorStats = {
					totalValidatorsInSet: rollupInfo.validators.length,
					activeValidators: 0,
					totalPeersInNetwork: 0,
					networkAttestationMissRate: 0,
					networkProposalMissRate: 0,
					countryDistribution: {},
					topCountry: null,
					top3Countries: [],
					clientDistribution: {},
					ispDistribution: {},
					topISP: null,
					validatorsAttested24h: 0,
					validatorsProposed24h: 0,
					validatorsWithPeers: 0,
					lastUpdated: Date.now(),
					currentEpoch,
					currentSlot: Number(rollupInfo.currentSlot),
				};
			}
		} catch (error) {
			logger.error(error, "Error calculating network stats from database");
			throw error;
		}
	}
}

// Export a singleton instance
export const l2InfoService = L2InfoService.getInstance();

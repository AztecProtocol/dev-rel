/**
 * @fileoverview L2 Information service for blockchain data via JSON-RPC
 * @description Provides methods for retrieving L2 blockchain state and validator information
 * @module sparta/discord/services
 */

import { logger } from "@sparta/utils/logger";

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

/**
 * Service for retrieving L2 blockchain information and validator data via RPC
 */
export class L2InfoService {
	private static instance: L2InfoService | null = null;
	private rpcUrl: string;
	private initialized: boolean = false;

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
	 * Send a JSON-RPC request to the configured endpoint
	 * @param method RPC method name
	 * @param params Array of parameters to pass to the method
	 * @returns The result field from the RPC response
	 */
	private async sendJsonRpcRequest(
		method: string,
		params: any[] = []
	): Promise<any> {
		try {
			// Initialize if not already done
			if (!this.initialized) {
				await this.init();
			}

			const response = await fetch(this.rpcUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					method,
					params,
					id: 1, // Arbitrary ID
				}),
			});

			if (!response.ok) {
				throw new Error(
					`HTTP error! status: ${response.status} ${response.statusText}`
				);
			}

			const data: JsonRpcResponse = await response.json();

			if (data.error) {
				throw new Error(
					`RPC error! code: ${data.error.code}, message: ${data.error.message}`
				);
			}

			if (data.result === undefined) {
				throw new Error("RPC response missing result field.");
			}

			return data.result;
		} catch (error) {
			logger.error(error,`Error in RPC call to ${method}`);
			throw error;
		}
	}

	/**
	 * Get the latest L2 block tips
	 * @returns The proven block number as a string
	 */
	public async getL2Tips(): Promise<string> {
		try {
			const result = await this.sendJsonRpcRequest("node_getL2Tips");
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
			// Assuming the RPC method takes blockNumber as a parameter.
			// The previous version passed it twice, let's try with one first.
			return await this.sendJsonRpcRequest("node_getArchiveSiblingPath", [
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
	 * @param targetAddress Ethereum address to check (lowercase expected by RPC)
	 * @returns Attestation status with details from RPC
	 */
	public async fetchValidatorStats(
		targetAddress: string
	): Promise<RpcAttestationResult> {
		try {
			// Ensure address is lowercase for matching keys in the response
			const lowerCaseAddress = targetAddress.toLowerCase();

			const data = (await this.sendJsonRpcRequest(
				RPC_METHOD_VALIDATOR_STATS,
				[]
			)) as ValidatorsStatsResponse;

			const validatorStats = data.stats[lowerCaseAddress];

			if (!validatorStats) {
				return {
					hasAttested24h: false,
					error: `Validator ${targetAddress} not found in node stats.`,
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
		} catch (error) {
			logger.error(error, "Error fetching or processing validator stats via RPC");
			return {
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
}

// Export a singleton instance
export const l2InfoService = L2InfoService.getInstance();

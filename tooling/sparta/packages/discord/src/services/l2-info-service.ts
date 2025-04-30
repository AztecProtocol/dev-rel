import { logger } from "@sparta/utils/logger";

// RPC endpoint URL
const RPC_URL = process.env.RPC_URL || "http://35.230.8.105:8080"; // Use env var or default
const RPC_METHOD = "node_getValidatorsStats";

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
	result?: ValidatorsStatsResponse; // Make result optional for error handling
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
 * Fetches validator stats via RPC and checks recent attestation.
 * @param targetAddress Ethereum address to check (lowercase expected by RPC)
 * @returns Attestation status with details from RPC
 */
export async function fetchValidatorStatsFromRpc(
	targetAddress: string
): Promise<RpcAttestationResult> {
	try {
		// Ensure address is lowercase for matching keys in the response
		const lowerCaseAddress = targetAddress.toLowerCase();

		logger.info(
			`Fetching validator stats from ${RPC_URL} for ${lowerCaseAddress}...`
		);

		const response = await fetch(RPC_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: RPC_METHOD,
				params: [], // No specific params needed for getValidatorsStats
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

		if (!data.result) {
			throw new Error("RPC response missing result field.");
		}

		const validatorStats = data.result.stats[lowerCaseAddress];

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
					lastAttestationTimestampBigInt >= twentyFourHoursAgoSeconds
				) {
					hasAttested24h = true;
				}
			} catch (e) {
				logger.error(
					"Error converting attestation timestamp to BigInt:",
					e
				);
			}
		}

		if (lastProposal) {
			try {
				lastProposalTimestampBigInt = BigInt(lastProposal.timestamp);
				lastProposalSlotBigInt = BigInt(lastProposal.slot);
				lastProposalDate = lastProposal.date;
			} catch (e) {
				logger.error(
					"Error converting proposal timestamp/slot to BigInt:",
					e
				);
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
			missedAttestationsCount: validatorStats.missedAttestations?.count,
			missedProposalsCount: validatorStats.missedProposals?.count,
			totalSlots: validatorStats.totalSlots,
			error: undefined, // No error if we got this far
		};
	} catch (error) {
		logger.error(
			"Error fetching or processing validator stats via RPC:",
			error
		);
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

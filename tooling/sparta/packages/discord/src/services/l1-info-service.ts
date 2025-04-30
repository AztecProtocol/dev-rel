/**
 * @fileoverview Chain Information service for Ethereum blockchain data via API
 * @description Provides methods for retrieving blockchain state and validator information
 * @module sparta/discord/services
 */

import { logger } from "@sparta/utils";
import { Ethereum, getEthereumInstance } from "@sparta/ethereum";

/**
 * Interface for blockchain information data
 */
type ChainInfo = {
	pendingBlockNum: string;
	provenBlockNum: string;
	validators: string[];
	committee: string[];
	currentEpoch: string;
	currentSlot: string;
	proposerNow: string;
};

/**
 * Service for retrieving blockchain information and validator data via API
 */
export class ChainInfoService {
	private static instance: ChainInfoService | null = null;
	private ethereum: Ethereum | null = null;

	private constructor() {
		// Private constructor for singleton pattern
	}

	/**
	 * Gets the singleton instance of ChainInfoService
	 */
	public static getInstance(): ChainInfoService {
		if (!ChainInfoService.instance) {
			ChainInfoService.instance = new ChainInfoService();
		}
		return ChainInfoService.instance;
	}

	/**
	 * Initialize the service with Ethereum instance
	 */
	public async init(): Promise<void> {
		if (this.ethereum) return; // Already initialized

		try {
			this.ethereum = await getEthereumInstance();
			logger.info("ChainInfo service initialized with Ethereum instance");
		} catch (error) {
			logger.error({ error }, "Failed to initialize ChainInfo service");
			throw error;
		}
	}

	/**
	 * Retrieves comprehensive information about the current blockchain state via API
	 *
	 * @returns {Promise<ChainInfo>} A promise that resolves to an object containing chain information
	 * @throws Will throw an error if retrieving chain information fails
	 */
	public async getInfo(): Promise<ChainInfo> {
		try {
			// Initialize if not already done
			if (!this.ethereum) {
				await this.init();
			}

			// Get the API client
			const rollup = this.ethereum!.getRollup();

			// Make API calls to fetch blockchain info
			const [
				pendingBlockNum,
				provenBlockNum,
				validators,
				committee,
				currentEpoch,
				currentSlot,
				proposerNow,
			] = await Promise.all([
				rollup.read.getPendingBlockNumber(),
				rollup.read.getProvenBlockNumber(),
				rollup.read.getAttesters(),
				rollup.read.getCurrentEpochCommittee(),
				rollup.read.getCurrentEpoch(),
				rollup.read.getCurrentSlot(),
				rollup.read.getCurrentProposer(),
			]);

			logger.info("Retrieved chain info from API");

			return {
				pendingBlockNum: pendingBlockNum,
				provenBlockNum: provenBlockNum,
				validators: validators,
				committee: committee,
				currentEpoch: currentEpoch,
				currentSlot: currentSlot,
				proposerNow: proposerNow,
			};
		} catch (error) {
			logger.error({ error }, "Error getting chain info");
			throw error;
		}
	}
}

// Export a singleton instance
export const chainInfoService = ChainInfoService.getInstance();

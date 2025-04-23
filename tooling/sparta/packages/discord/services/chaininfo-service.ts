/**
 * @fileoverview Chain Information service for Ethereum blockchain data
 * @description Provides methods for retrieving blockchain state and validator information
 * @module sparta/services/chaininfo-service
 */

import { ethereum } from "../clients/ethereum.js";
import { getExpectedAddress } from "../clients/ethereum.js";
import { logger } from "@sparta/utils";

/**
 * Interface for blockchain information data
 *
 * @property {string} pendingBlockNum - The current pending block number
 * @property {string} provenBlockNum - The current proven block number
 * @property {string[]} validators - Array of validator addresses
 * @property {string[]} forwardedValidators - Array of forwarded validator addresses
 * @property {string[]} committee - Array of committee member addresses
 * @property {string[]} forwardedCommittee - Array of forwarded committee addresses
 * @property {string[]} archive - Array of archived addresses
 * @property {string} currentEpoch - The current epoch number
 * @property {string} currentSlot - The current slot number
 * @property {string} proposerNow - The current proposer address
 */
type ChainInfo = {
	pendingBlockNum: string;
	provenBlockNum: string;
	validators: string[];
	forwardedValidators: string[];
	committee: string[];
	forwardedCommittee: string[];
	archive: string[];
	currentEpoch: string;
	currentSlot: string;
	proposerNow: string;
};

/**
 * Service for retrieving blockchain information and validator data
 *
 * This service provides methods to:
 * - Get current block information (pending, proven)
 * - Get validator and committee lists
 * - Get epoch and slot information
 * - Get current proposer information
 */
export class ChainInfoService {
	/**
	 * Retrieves comprehensive information about the current blockchain state
	 *
	 * This method gathers blockchain data from multiple sources and returns
	 * a consolidated view of the current chain state, including:
	 * - Block numbers (pending and proven)
	 * - Validator lists
	 * - Committee information
	 * - Epoch and slot data
	 * - Current proposer
	 *
	 * @returns {Promise<ChainInfo>} A promise that resolves to an object containing chain information
	 *
	 * @example
	 * // Get chain information
	 * const chainInfo = await ChainInfoService.getInfo();
	 * console.log(`Current epoch: ${chainInfo.currentEpoch}`);
	 * console.log(`Current slot: ${chainInfo.currentSlot}`);
	 * console.log(`Pending block: ${chainInfo.pendingBlockNum}`);
	 *
	 * @throws Will throw an error if retrieving chain information fails
	 */
	static async getInfo(): Promise<ChainInfo> {
		try {
			const rollup = ethereum.getRollup();
			const [
				pendingNum,
				provenNum,
				validators,
				committee,
				archive,
				epochNum,
				slot,
				nextBlockTS,
			] = await Promise.all([
				rollup.read.getPendingBlockNumber(),
				rollup.read.getProvenBlockNumber(),
				rollup.read.getAttesters(),
				rollup.read.getCurrentEpochCommittee(),
				rollup.read.archive(),
				rollup.read.getCurrentEpoch(),
				rollup.read.getCurrentSlot(),
				rollup.read.getCurrentProposer(),
				(async () => {
					const block = await ethereum.getPublicClient().getBlock();
					return BigInt(block.timestamp + BigInt(12));
				})(),
			]);

			const proposer = await rollup.read.getProposerAt([nextBlockTS]);

			return {
				pendingBlockNum: pendingNum as string,
				provenBlockNum: provenNum as string,
				validators: validators,
				forwardedValidators: validators.map(
					(e: `0x${string}`) => getExpectedAddress([e], e).address
				),
				committee: committee,
				forwardedCommittee: committee.map(
					(e: `0x${string}`) => getExpectedAddress([e], e).address
				),
				archive: archive as string[],
				currentEpoch: epochNum as string,
				currentSlot: slot as string,
				proposerNow: proposer as string,
			};
		} catch (error) {
			logger.error(error, "Error getting chain info");
			throw error;
		}
	}
}

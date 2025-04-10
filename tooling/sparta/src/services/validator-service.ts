/**
 * @fileoverview Validator service for Ethereum validator management
 * @description Provides methods for managing validators on the Ethereum network
 * @module sparta/services/validator-service
 */

import { exec } from "child_process";
import { promisify } from "util";
import { ethereum } from "../clients/ethereum.js";
import { Transaction, TransactionReceipt } from "viem";

const execAsync = promisify(exec);

/**
 * Service for managing Ethereum validators
 *
 * This service provides methods to:
 * - Request tokens from a faucet for validators
 * - Add validators to the network
 * - Remove validators from the network
 * - Fund validators with ETH
 */
export class ValidatorService {
	/**
	 * Requests staking asset tokens from a faucet for a validator address
	 *
	 * This method calls the Ethereum client to distribute staking tokens
	 * to the specified address, which can then be used for staking.
	 *
	 * @param {string} address - The Ethereum address to receive staking tokens
	 * @returns {Promise<TransactionReceipt>} A promise that resolves to the transaction receipt
	 *
	 * @example
	 * // Request staking tokens for a validator
	 * const receipt = await ValidatorService.stakingAssetFaucet("0x123...");
	 * console.log(`Transaction hash: ${receipt.transactionHash}`);
	 *
	 * @throws Will throw an error if the faucet transaction fails
	 */
	static async stakingAssetFaucet(
		address: string
	): Promise<TransactionReceipt> {
		try {
			return await ethereum.stakingAssetFaucet(address);
		} catch (error) {
			console.error("Error adding validator:", error);
			throw error;
		}
	}

	/**
	 * Adds a new validator to the Ethereum network
	 *
	 * This method registers the provided address as a validator
	 * in the validator registry contract.
	 *
	 * @param {string} address - The Ethereum address to add as a validator
	 * @returns {Promise<TransactionReceipt[]>} A promise that resolves to an array of transaction receipts
	 *
	 * @example
	 * // Add a new validator
	 * const receipts = await ValidatorService.addValidator("0x123...");
	 * console.log(`Added validator in ${receipts.length} transactions`);
	 *
	 * @throws Will throw an error if adding the validator fails
	 */
	static async addValidator(address: string): Promise<TransactionReceipt[]> {
		try {
			return await ethereum.addValidator(address);
		} catch (error) {
			console.error("Error adding validator:", error);
			throw error;
		}
	}

	/**
	 * Removes a validator from the Ethereum network
	 *
	 * This method deregisters the provided address from the
	 * validator registry contract.
	 *
	 * @param {string} address - The Ethereum address to remove as a validator
	 * @returns {Promise<TransactionReceipt>} A promise that resolves to the transaction receipt
	 *
	 * @example
	 * // Remove a validator
	 * const receipt = await ValidatorService.removeValidator("0x123...");
	 * console.log(`Removed validator in transaction ${receipt.transactionHash}`);
	 *
	 * @throws Will throw an error if removing the validator fails
	 */
	static async removeValidator(address: string): Promise<TransactionReceipt> {
		try {
			return await ethereum.removeValidator(address);
		} catch (error) {
			console.error("Error removing validator:", error);
			throw error;
		}
	}

	/**
	 * Funds a validator address with ETH
	 *
	 * This method sends ETH to the specified address using the cast command
	 * from the Foundry toolkit. The amount sent is specified in the FUNDER_AMOUNT
	 * environment variable.
	 *
	 * @param {string} address - The Ethereum address to fund with ETH
	 * @returns {Promise<string>} A promise that resolves to the command output
	 *
	 * @example
	 * // Fund a validator with ETH
	 * const output = await ValidatorService.fundValidator("0x123...");
	 * console.log(`Funding result: ${output}`);
	 *
	 * @throws Will throw an error if funding the validator fails
	 */
	static async fundValidator(address: string): Promise<string> {
		try {
			const command = `cast send --value ${process.env.FUNDER_AMOUNT} --rpc-url ${process.env.ETHEREUM_HOST} --chain-id ${process.env.L1_CHAIN_ID} --private-key ${process.env.FUNDER_ADDRESS_PRIVATE_KEY} ${address}`;

			const { stdout, stderr } = await execAsync(command);

			if (stderr) {
				throw new Error(stderr);
			}

			return stdout;
		} catch (error) {
			console.error("Error funding validator:", error);
			throw error;
		}
	}
}

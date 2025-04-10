import { exec } from "child_process";
import { promisify } from "util";
import { ethereum } from "../clients/ethereum.js";
import { aztec } from "../clients/aztec.js";
import { Transaction, TransactionReceipt } from "viem";

const execAsync = promisify(exec);

export class ValidatorService {
	static async checkSync(
		blockNumber: string,
		merkleProof: string
	): Promise<boolean> {
		try {
			const isSynced = await aztec.proveSynced(blockNumber, merkleProof);
			if (!isSynced) {
				throw new Error("Validator is not synced, won't be added");
			}
			return true;
		} catch (error) {
			console.error("Error registering validator:", error);
			throw error;
		}
	}

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

	static async addValidator(address: string): Promise<TransactionReceipt[]> {
		try {
			return await ethereum.addValidator(address);
		} catch (error) {
			console.error("Error adding validator:", error);
			throw error;
		}
	}

	static async removeValidator(address: string): Promise<TransactionReceipt> {
		try {
			return await ethereum.removeValidator(address);
		} catch (error) {
			console.error("Error removing validator:", error);
			throw error;
		}
	}

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

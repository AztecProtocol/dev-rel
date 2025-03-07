import { exec } from "child_process";
import { promisify } from "util";
import { ethereum } from "../index.js";
import { Transaction, TransactionReceipt } from "viem";

const execAsync = promisify(exec);

export class ValidatorService {
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
			const command = `cast send --value ${process.env.ETHEREUM_VALUE} --rpc-url ${process.env.ETHEREUM_HOST} --chain-id ${process.env.ETHEREUM_CHAIN_ID} --private-key ${process.env.MINTER_PRIVATE_KEY} ${address}`;

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

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class ValidatorService {
	static async addValidator(address: string): Promise<string> {
		try {
			// Send ETH to the validator address
			await this.fundValidator(address);

			// Add validator to the set
			const command = `docker run --rm aztecprotocol/aztec:unhinged-unicorn add-l1-validator -u ${process.env.ETHEREUM_HOST} --validator ${address} --rollup ${process.env.ETHEREUM_ROLLUP_ADDRESS} --withdrawer ${process.env.ETHEREUM_ADMIN_ADDRESS} --l1-chain-id ${process.env.ETHEREUM_CHAIN_ID} --mnemonic "${process.env.ETHEREUM_MNEMONIC}"`;

			const { stdout, stderr } = await execAsync(command);

			if (stderr) {
				throw new Error(stderr);
			}

			return stdout;
		} catch (error) {
			console.error("Error adding validator:", error);
			throw error;
		}
	}

	static async removeValidator(address: string): Promise<string> {
		try {
			// Add validator to the set
			const command = `docker run --rm aztecprotocol/aztec:unhinged-unicorn remove-l1-validator -u ${process.env.ETHEREUM_HOST} --validator ${address} --rollup ${process.env.ETHEREUM_ROLLUP_ADDRESS} --l1-chain-id ${process.env.ETHEREUM_CHAIN_ID} --mnemonic "${process.env.ETHEREUM_MNEMONIC}"`;

			const { stdout, stderr } = await execAsync(command);

			if (stderr) {
				throw new Error(stderr);
			}

			return stdout;
		} catch (error) {
			console.error("Error removing validator:", error);
			throw error;
		}
	}

	static async fundValidator(address: string): Promise<string> {
		try {
			const command = `cast send --value ${process.env.ETHEREUM_VALUE} --rpc-url ${process.env.ETHEREUM_HOST} --chain-id ${process.env.ETHEREUM_CHAIN_ID} --private-key ${process.env.ETHEREUM_PRIVATE_KEY} ${address}`;

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

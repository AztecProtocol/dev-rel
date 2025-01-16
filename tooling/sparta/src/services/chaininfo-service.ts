import { exec } from "child_process";
import { promisify } from "util";
import {
	ETHEREUM_HOST,
	ETHEREUM_ROLLUP_ADDRESS,
	ETHEREUM_CHAIN_ID,
} from "../env.js";

type ChainInfo = {
	pendingBlockNum: string;
	provenBlockNum: string;
	validators: string[];
	committee: string[];
	archive: string[];
	currentEpoch: string;
	currentSlot: string;
	proposerNow: string;
};

const execAsync = promisify(exec);

export class ChainInfoService {
	static async getInfo(): Promise<ChainInfo> {
		try {
			// Add validator to the set
			const command = `docker run --rm aztecprotocol/aztec:unhinged-unicorn debug-rollup -u ${ETHEREUM_HOST} --rollup ${ETHEREUM_ROLLUP_ADDRESS} --l1-chain-id ${ETHEREUM_CHAIN_ID} `;

			console.log("Running command:", command);
			const { stdout, stderr } = await execAsync(command);

			if (stderr) {
				throw new Error(stderr);
			}

			// looks like hell, but it just parses the output of the command
			// into a key-value object
			const info = stdout
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean)
				.reduce((acc, s) => {
					const [key, value] = s.split(": ");
					const sanitizedKey = key
						.toLowerCase()
						.replace(/\s+(.)/g, (_, c) => c.toUpperCase());
					return { ...acc, [sanitizedKey]: value };
				}, {});

			return info as ChainInfo;
		} catch (error) {
			console.error("Error getting chain info:", error);
			throw error;
		}
	}
}

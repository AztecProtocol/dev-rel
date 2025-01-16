import { exec } from "child_process";
import { promisify } from "util";
import { ETHEREUM_HOST, ETHEREUM_ROLLUP_ADDRESS, ETHEREUM_ADMIN_ADDRESS, ETHEREUM_CHAIN_ID, ETHEREUM_MNEMONIC, ETHEREUM_PRIVATE_KEY, ETHEREUM_VALUE, } from "../env.js";
const execAsync = promisify(exec);
export class ValidatorService {
    static async addValidator(address) {
        try {
            // Send ETH to the validator address
            await this.fundValidator(address);
            // Add validator to the set
            const command = `docker run --rm aztecprotocol/aztec:unhinged-unicorn add-l1-validator -u ${ETHEREUM_HOST} --validator ${address} --rollup ${ETHEREUM_ROLLUP_ADDRESS} --withdrawer ${ETHEREUM_ADMIN_ADDRESS} --l1-chain-id ${ETHEREUM_CHAIN_ID} --mnemonic "${ETHEREUM_MNEMONIC}"`;
            const { stdout, stderr } = await execAsync(command);
            if (stderr) {
                throw new Error(stderr);
            }
            return stdout;
        }
        catch (error) {
            console.error("Error adding validator:", error);
            throw error;
        }
    }
    static async fundValidator(address) {
        try {
            const command = `cast send --value ${ETHEREUM_VALUE} --rpc-url ${ETHEREUM_HOST} --chain-id ${ETHEREUM_CHAIN_ID} --private-key ${ETHEREUM_PRIVATE_KEY} ${address}`;
            const { stdout, stderr } = await execAsync(command);
            if (stderr) {
                throw new Error(stderr);
            }
            return stdout;
        }
        catch (error) {
            console.error("Error funding validator:", error);
            throw error;
        }
    }
}

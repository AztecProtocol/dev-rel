import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getEthereumInstance } from "@sparta/ethereum";
import { logger } from "@sparta/utils";

export const get = async (
	interaction: ChatInputCommandInteraction
): Promise<string> => {
	try {
		// Get Ethereum instance
		const ethereum = await getEthereumInstance();

		// Get chain info directly
		const {
			pendingBlockNum,
			provenBlockNum,
			currentEpoch,
			currentSlot,
			proposerNow,
		} = await ethereum.getRollupInfo();

		await interaction.reply({
			content: `
Pending block: [${pendingBlockNum}](https://aztecscan.xyz/blocks/${pendingBlockNum})
Proven block: [${provenBlockNum}](https://aztecscan.xyz/blocks/${provenBlockNum})
Current epoch: ${currentEpoch}
Current slot: ${currentSlot}
Proposer now: [${proposerNow}](https://sepolia.etherscan.io/address/${proposerNow})`,
			flags: MessageFlags.SuppressEmbeds,
		});
		return `Pending block: ${pendingBlockNum}\nProven block: ${provenBlockNum}\nCurrent epoch: ${currentEpoch}\nCurrent slot: ${currentSlot}\nProposer now: ${proposerNow}`;
	} catch (error) {
		logger.error(error, "Error getting chain info");
		throw error;
	}
};

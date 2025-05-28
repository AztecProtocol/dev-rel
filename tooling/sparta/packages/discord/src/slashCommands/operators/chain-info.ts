import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getEthereumInstance } from "@sparta/ethereum";
import { logger } from "@sparta/utils";
import { manageChannelMessage } from "../../utils/messageManager.js";

export const get = async (
	interaction: ChatInputCommandInteraction
): Promise<string> => {
	try {
		await interaction.deferReply();

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

		const chainMessage = await interaction.editReply({
			content: `
🛡️ **SPARTAN NETWORK REPORT** 🛡️

⚔️ **Battlefield Status:**
• Pending block: [${pendingBlockNum}](https://aztecscan.xyz/blocks/${pendingBlockNum}) - *Awaiting confirmation*
• Proven block: [${provenBlockNum}](https://aztecscan.xyz/blocks/${provenBlockNum}) - *Battle tested & secured*
• Current epoch: **${currentEpoch}** - *Era of combat*
• Current slot: **${currentSlot}** - *Position in formation*
• Commander on duty (proposer): [${proposerNow}](https://sepolia.etherscan.io/address/${proposerNow}) - *Leading the charge*

🏛️ The Aztec Network stands strong, warrior! 🏛️`,
			flags: MessageFlags.SuppressEmbeds,
		});

		// Use the message manager utility to handle cleanup
		await manageChannelMessage(interaction, 'chain-info', chainMessage);

		return `Pending block: ${pendingBlockNum}\nProven block: ${provenBlockNum}\nCurrent epoch: ${currentEpoch}\nCurrent slot: ${currentSlot}\nProposer now: ${proposerNow}`;
	} catch (error) {
		logger.error(error, "Error getting chain info");
		throw error;
	}
};

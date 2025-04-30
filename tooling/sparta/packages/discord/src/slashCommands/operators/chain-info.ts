import {
	ChatInputCommandInteraction,
	DiscordAPIError,
	MessageFlags,
	TextChannel,
} from "discord.js";
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

		const channel = interaction.channel as TextChannel;
		const messages = await channel.messages.fetch({
			limit: 15,
		});

		// Filter for bot messages that look like chain info responses
		// and aren't the current interaction's response
		const botMessages = messages.filter(
			(m) =>
				m.author.id === interaction.client.user?.id &&
				m.content.includes("Pending block:") &&
				m.content.includes("Proven block:") &&
				m.content.includes("Current epoch:") &&
				!m.flags.has(MessageFlags.Ephemeral) &&
				// Ensure we don't delete the message we're about to send
				m.id !== interaction.id
		);

		if (botMessages.size > 0) {
			try {
				// Try bulk delete first (only works for messages less than 14 days old)
				await channel.bulkDelete(botMessages);
			} catch (error) {
				// If bulk delete fails (e.g., messages are too old), delete individually
				if (error instanceof DiscordAPIError && error.code === 50034) {
					for (const message of Array.from(botMessages.values())) {
						try {
							await message.delete();
						} catch (deleteError) {
							console.error(
								"Error deleting individual message:",
								deleteError
							);
						}
					}
				} else {
					throw error;
				}
			}
		}

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

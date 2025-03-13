import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
	TextChannel,
	DiscordAPIError,
} from "discord.js";
import { ChainInfoService } from "../services/chaininfo-service.js";

export default {
	data: new SlashCommandBuilder()
		.setName("get-info")
		.setDescription("Get chain info"),

	execute: async (interaction: ChatInputCommandInteraction) => {
		// Defer reply without ephemeral flag to make it visible to everyone
		await interaction.deferReply();

		try {
			const {
				pendingBlockNum,
				provenBlockNum,
				currentEpoch,
				currentSlot,
				proposerNow,
			} = await ChainInfoService.getInfo();

			// Delete previous get-info messages from the bot in this channel
			try {
				if (interaction.channel && !interaction.channel.isDMBased()) {
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
							if (
								error instanceof DiscordAPIError &&
								error.code === 50034
							) {
								for (const message of botMessages.values()) {
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
				}
			} catch (error) {
				console.error("Error deleting previous messages:", error);
				// Continue with the command even if message deletion fails
			}

			await interaction.editReply({
				content: `Pending block: ${pendingBlockNum}\nProven block: ${provenBlockNum}\nCurrent epoch: ${currentEpoch}\nCurrent slot: ${currentSlot}\nProposer now: ${proposerNow}`,
			});
			return `Got chain info`;
		} catch (error) {
			await interaction.editReply({
				content: `Failed to get chain info`,
			});
			return `Failed with error: ${
				error instanceof Error && error.message
			}`;
		}
	},
};

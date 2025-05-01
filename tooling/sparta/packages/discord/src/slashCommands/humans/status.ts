/**
 * @fileoverview Human Passport status command handler
 * @description Handles Discord commands for checking Human Passport status
 * @module sparta/discord/roles/humans/status
 */

import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { logger } from "@sparta/utils";
import { getDiscordInstance } from "../../clients/discord";
import { HumanSubcommands } from "../../types.js";

/**
 * Command definition for the status subcommand
 */
export const statusSubcommand = new SlashCommandSubcommandBuilder()
	.setName(HumanSubcommands.Status)
	.setDescription("Check your Human Passport verification status");

/**
 * Handles the passport status command
 * Returns the user's current verification status
 */
export async function handleStatusCommand(
	interaction: ChatInputCommandInteraction
): Promise<void> {
	try {
		const userId = interaction.user.id;

		// Get API client
		const discord = await getDiscordInstance();
		const apiProvider = discord.getApiProvider();
		const client = apiProvider.getClient();

		// Get user status from API
		const userResponse = await client.getUserByDiscordId({
			discordUserId: userId,
		});

		const user = userResponse.data.user;

		if (!user) {
			await interaction.editReply({
				content:
					"You haven't initiated verification yet. Use `/human verify` to get started.",
			});
			return;
		}

		const humanPassport = user.humanPassport;

		// Get status from API if available
		let status = "Not verified";
		let verified = false;
		let score: number | null = null;

		if (humanPassport) {
			if (humanPassport.verificationId) {
				const {
					data: { user },
				} = await client.getUserByVerificationId({
					verificationId: humanPassport.verificationId,
				});

				if (user && user.humanPassport) {
					status = user.humanPassport.status || "Not verified";
					score = user.humanPassport.score || null;
				}
			}
		}

		// Build a status embed based on the current state
		const embed = new EmbedBuilder()
			.setColor(verified ? 0x00ff00 : 0xffaa00)
			.setTitle("Human Passport Status")
			.addFields({
				name: "Status",
				value: status,
			});

		// Add score info if available
		if (score !== null) {
			embed.addFields({
				name: "Score",
				value: `${score} (minimum required: ${
					process.env.MINIMUM_SCORE || "0"
				})`,
			});
		}

		// Different messages based on status
		if (verified) {
			embed.setDescription("✅ You are verified as human!");
		} else {
			const publicFrontendUrl = process.env.VITE_APP_API_URL;
			const verificationUrl = `${publicFrontendUrl}/?verificationId=${humanPassport?.verificationId}`;

			embed.setDescription(
				"You need to complete your verification by signing a message with your wallet. Click the button below to continue."
			);

			const verifyButton = new ButtonBuilder()
				.setLabel("Complete Verification")
				.setURL(verificationUrl)
				.setStyle(ButtonStyle.Link);

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				verifyButton
			);

			await interaction.editReply({
				embeds: [embed],
				components: [row],
			});
			return;
		}

		await interaction.editReply({
			embeds: [embed],
		});
	} catch (error: any) {
		logger.error(error, "Error handling passport status command");

		await interaction.editReply({
			content:
				"An error occurred while checking your verification status.",
		});
	}
}

export default {
	execute: handleStatusCommand,
	data: statusSubcommand,
};

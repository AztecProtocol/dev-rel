/**
 * @fileoverview Human Passport verification command handler
 * @description Handles Discord commands for Human Passport verification
 * @module sparta/discord/roles/humans/verify
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
import { randomUUID } from "crypto";
import { VERIFICATION_STATUS } from "@sparta/utils/const";
import { getDiscordInstance } from "../../clients/discord";
import { HumanSubcommands } from "../../types.js";

/**
 * Command definition for the verify subcommand
 */
export const verifySubcommand = new SlashCommandSubcommandBuilder()
	.setName(HumanSubcommands.Verify)
	.setDescription("Verify your identity with Human Passport");

/**
 * Handles the passport verify command
 * Creates a verification link for the user
 */
export async function handleVerifyCommand(
	interaction: ChatInputCommandInteraction
): Promise<void> {
	try {
		const userId = interaction.user.id;
		const interactionToken = interaction.token;
		const verificationId = randomUUID();
		let discordUsername = interaction.user.username;

		// Get API client
		const discord = await getDiscordInstance();
		const apiProvider = discord.getApiProvider();
		const client = apiProvider.getClient();

		logger.debug(
			{ userId, interactionToken, verificationId },
			"Verify command"
		);

		// Check if the user already exists
		const userResponse = await client.getUserByDiscordId({
			discordUserId: userId,
		});

		try {
			logger.debug({ userResponse }, "User response");

			const user = userResponse.data.user;

			if (user) {
				// Update existing user
				await client.updateUser(
					{ discordUserId: userId },
					{
						humanPassport: {
							status:
								user.humanPassport?.status ||
								VERIFICATION_STATUS.NOT_VERIFIED,
							verificationId,
							interactionToken,
						},
					}
				);

				logger.info(
					{ userId, verificationId, interactionToken },
					"Updated user verification data"
				);
			} else {
				// Create a new user
				const timestamp = Date.now();

				logger.debug({
					discordUserId: userId,
					discordUsername,
					walletAddress: undefined,
					role: undefined,
					humanPassport: {
						status: VERIFICATION_STATUS.NOT_VERIFIED,
						verificationId,
						interactionToken,
						lastVerificationTime: null,
						score: null,
					},
				});

				await client.createUser({
					discordUserId: userId,
					discordUsername,
					walletAddress: undefined,
					role: undefined,
					humanPassport: {
						//@ts-ignore
						status: VERIFICATION_STATUS.NOT_VERIFIED,
						verificationId,
						interactionToken,
						lastVerificationTime: null,
						score: null,
					},
					createdAt: timestamp,
					updatedAt: timestamp,
				});

				logger.info(
					{ userId, verificationId },
					"Created new user with verification data"
				);
			}

			// Create an embed with instructions
			const embed = new EmbedBuilder()
				.setColor(0x0099ff)
				.setTitle("Human Passport Verification")
				.setDescription(
					"To verify your identity and unlock roles, click the button below to connect your wallet and complete the verification process."
				)
				.addFields(
					{
						name: "What is Human Passport?",
						value: "Human Passport is a sybil resistance tool that verifies you're a unique human.",
					},
					{
						name: "Passport Status",
						value: `You'll need a score of at least ${
							process.env.MINIMUM_SCORE || "0"
						} to verify.`,
					}
				)
				.setFooter({
					text: "This verification link will expire in 30 minutes.",
				});

			// Construct the verification URL
			const publicFrontendUrl = process.env.VITE_APP_API_URL;
			if (!publicFrontendUrl) {
				logger.error(
					"VITE_APP_API_URL environment variable is not set!"
				);
				await interaction.editReply({
					content:
						"Configuration error. Please contact an administrator.",
				});
				return;
			}

			const verificationUrl = `${publicFrontendUrl}/?verificationId=${verificationId}`;

			// Create a button with the verification link
			const verifyButton = new ButtonBuilder()
				.setLabel("Verify with Human Passport")
				.setURL(verificationUrl)
				.setStyle(ButtonStyle.Link);

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				verifyButton
			);

			// Send the embed and button to the user
			await interaction.editReply({
				embeds: [embed],
				components: [row],
			});

			logger.info(
				{ userId, verificationId, interactionToken },
				"Created verification session for user"
			);
		} catch (error: any) {
			logger.error(error, "Error handling passport verify command");

			await interaction.editReply({
				content:
					"An error occurred while creating your verification session. Please try again later.",
			});
		}
	} catch (error: any) {
		logger.error(error, "Error handling passport verify command");

		await interaction.editReply({
			content:
				"An error occurred while creating your verification session. Please try again later.",
		});
	}
}

export default {
	execute: handleVerifyCommand,
	data: verifySubcommand,
};

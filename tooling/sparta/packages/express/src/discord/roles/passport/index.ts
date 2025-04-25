/**
 * @fileoverview Passport verification command handler
 * @description Handles Discord commands for Human Passport verification
 * @module sparta/roles/passport
 */

import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
} from "discord.js";
import { logger } from "@sparta/utils";
import axios from "axios";

export enum PassportSubcommands {
	Verify = "verify",
	Status = "status",
}

// Create an Axios instance for API calls related to Passport
const api = axios.create({
	baseURL: `${process.env.PUBLIC_FRONTEND_URL}/api`, // Use PUBLIC_FRONTEND_URL
	headers: {
		'Content-Type': 'application/json',
	},
});

/**
 * Command data for passport verification commands
 */
const passportCommandData = new SlashCommandBuilder()
	.setName("passport")
	.setDescription("Human Passport verification commands")
	.addSubcommand((subcommand) =>
		subcommand
			.setName(PassportSubcommands.Verify)
			.setDescription("Verify your identity with Human Passport")
	)
/**
 * Handles the passport verify command
 * Creates a verification link for the user
 */
export async function handleVerifyCommand(
	interaction: ChatInputCommandInteraction
): Promise<void> {
	try {
		const userId = interaction.user.id;

		// Call the Express API to create a session
		const response = await api.post(`/create-session`, {
			userId,
			interactionToken: interaction.token
		});

		if (!response.data.success) {
			logger.error({ userId, error: response.data.error }, "Failed to create verification session via API.");
			await interaction.reply({
				content: "An error occurred while creating your verification session. Please try again.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const { sessionId, verificationUrl } = response.data;

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
					value: `You'll need a score of at least ${process.env.MINIMUM_SCORE || '0'} to verify.`,
				}
			)
			.setFooter({
				text: "This verification link will expire in 30 minutes.",
			});

		// Create a button with the verification link
		const verifyButton = new ButtonBuilder()
			.setLabel("Verify with Human Passport")
			.setURL(verificationUrl)
			.setStyle(ButtonStyle.Link);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			verifyButton
		);

		// Send the embed and button to the user
		await interaction.reply({
			embeds: [embed],
			components: [row],
			flags: MessageFlags.Ephemeral,
		});

		logger.info(
			{ userId, sessionId },
			"Created verification session for user via API"
		);
	} catch (error: any) {
		logger.error(
			error,
			"Error handling passport verify command"
		);

		await interaction.reply({
			content:
				"An error occurred while creating your verification session. Please try again later.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

/**
 * Main handler for passport commands
 */
async function execute(
	interaction: ChatInputCommandInteraction
): Promise<string | undefined> {
	const subcommand = interaction.options.getSubcommand();

	switch (subcommand) {
		case PassportSubcommands.Verify:
			await handleVerifyCommand(interaction);
			break;
		default:
			await interaction.reply({
				content: "Unknown command. Please try again.",
				ephemeral: true,
			});
	}
	return;
}

export default { passport: { data: passportCommandData, execute } };

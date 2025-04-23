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
import { logger, inMemoryDB, SESSION_TIMEOUT_MS } from "@sparta/utils";
import { passportService } from "../../services/index.js";
import { randomUUID } from "node:crypto";

export enum PassportSubcommands {
	Verify = "verify",
	Status = "status",
}

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
	.addSubcommand((subcommand) =>
		subcommand
			.setName(PassportSubcommands.Status)
			.setDescription("Check your Human Passport verification status")
	);

/**
 * Handles the passport verify command
 * Creates a verification link for the user
 */
export async function handleVerifyCommand(
	interaction: ChatInputCommandInteraction
): Promise<void> {
	try {
		const userId = interaction.user.id;

		// Generate a unique session ID
		const sessionId = randomUUID();

		// Create a verification session
		const sessionCreated = inMemoryDB.createSession(sessionId, userId);

		if (!sessionCreated) {
			// Handle potential session ID collision or other creation error
			logger.error({ userId }, "Failed to create verification session.");
			await interaction.reply({
				content:
					"An error occurred while creating your verification session (ID collision). Please try again.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Create a verification link
		const verificationLink = `${process.env.VERIFICATION_URL}?session=${sessionId}`;

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
					name: "Score Requirement",
					value: `You'll need a minimum score of ${passportService.getMinimumScore()}.`,
				}
			)
			.setFooter({
				text: "This verification link will expire in 30 minutes.",
			});

		// Create a button with the verification link
		const verifyButton = new ButtonBuilder()
			.setLabel("Verify with Human Passport")
			.setURL(verificationLink)
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
			"Created verification session for user"
		);
	} catch (error: any) {
		logger.error(
			{ error: error.message },
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
 * Handles the passport status command
 * Shows the user their current verification status
 */
export async function handleStatusCommand(
	interaction: ChatInputCommandInteraction
): Promise<void> {
	try {
		const userId = interaction.user.id;

		// Find the most recent session for this user
		const session = inMemoryDB.findSessionByDiscordId(userId);

		if (!session) {
			await interaction.reply({
				content:
					"You haven't started the verification process yet. Use `/passport verify` to begin.",
				ephemeral: true,
			});
			return;
		}

		// Create an embed with the user's status
		const embed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle("Verification Status");

		if (session.verified && session.roleAssigned) {
			embed.setDescription(
				"✅ Your wallet has been verified successfully and you've been assigned the verified role!"
			);
			embed.addFields({
				name: "Passport Score",
				value: `${session.score}`,
			});
		} else if (session.verified) {
			embed.setDescription(
				"✅ Your wallet has been verified, but we couldn't assign your role. Please contact an administrator."
			);
			embed.addFields({
				name: "Passport Score",
				value: `${session.score}`,
			});
		} else if (session.score !== undefined) {
			embed.setDescription(
				`❌ Your verification was unsuccessful. Your score (${
					session.score
				}) is below the required threshold (${passportService.getMinimumScore()}).`
			);
			embed.addFields({
				name: "What to do next",
				value: "Try connecting more verified accounts to your Passport to increase your score and try again.",
			});
		} else if (session.signature) {
			embed.setDescription(
				"⏳ Your signature has been received and your Passport is being verified. Check back in a few minutes."
			);
		} else if (session.walletAddress) {
			embed.setDescription(
				"⏳ Your wallet has been connected but the verification hasn't been completed. Please follow the link from your original verification message to complete the process."
			);
		} else {
			embed.setDescription(
				"⏳ You've started the verification process but haven't connected your wallet yet. Please follow the link from your original verification message."
			);
		}

		// Add session expiration information
		const now = Date.now(); // Use Date.now() for timestamp comparison
		const expirationTime = session.createdAt + SESSION_TIMEOUT_MS;
		const expiresIn = Math.max(
			0,
			Math.floor((expirationTime - now) / 60000)
		);
		embed.setFooter({
			text: `This verification session expires in ${expiresIn} minutes.`,
		});

		// Send the embed to the user
		await interaction.reply({
			embeds: [embed],
			ephemeral: true,
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message },
			"Error handling passport status command"
		);

		await interaction.reply({
			content:
				"An error occurred while checking your verification status. Please try again later.",
			ephemeral: true,
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
		case PassportSubcommands.Status:
			await handleStatusCommand(interaction);
			break;
		default:
			await interaction.reply({
				content: "Unknown command. Please try again.",
				ephemeral: true,
			});
	}

	return subcommand;
}

// Export passport command in the same format as other commands
const passport = {
	data: passportCommandData,
	execute,
};

export default {
	passport,
};

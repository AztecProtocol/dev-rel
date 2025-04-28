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
import { extendedDynamoDB } from "@sparta/express/db/userRepository";
import { randomUUID } from "crypto";
import type { HumanPassport, User } from "@sparta/express/routes/users";
import { VERIFICATION_STATUS } from "@sparta/utils/const.js";

export enum PassportSubcommands {
	Verify = "verify",
	Status = "status",
}

/**
 * Command data for passport verification commands
 */
const passportCommandData = new SlashCommandBuilder()
	.setName("human")
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
		const interactionToken = interaction.token;
		const verificationId = randomUUID();

		// Try to get Discord username
		let discordUsername = interaction.user.username;
		
		// Check if the user already exists
		let user = await extendedDynamoDB.getUser(userId);
		
		// If user exists, update their verification data
		if (user) {
			// Create or update humanPassport data
			const humanPassport: HumanPassport = {
				...user.humanPassport || {},
				status: VERIFICATION_STATUS.PENDING,
				verificationId,
				interactionToken
			};
			
			await extendedDynamoDB.updateUser(userId, {
				humanPassport,
				updatedAt: Date.now()
			});
			
			logger.info({ userId, verificationId }, "Updated user verification data");
		} else {
			// Create a new user with humanPassport data
			const timestamp = Date.now();
			const humanPassport: HumanPassport = {
				status: VERIFICATION_STATUS.PENDING,
				verificationId,
				interactionToken,
				lastVerificationTime: null,
				score: null
			};
			
			const newUser: User = {
				discordUserId: userId,
				discordUsername,
				walletAddress: null,
				role: null,
				humanPassport,
				createdAt: timestamp,
				updatedAt: timestamp
			};
			
			const created = await extendedDynamoDB.createUser(newUser);
			if (!created) {
				// Handle creation error
				logger.error({ userId }, "Failed to create user.");
				await interaction.reply({
					content: "Failed to create your verification session. Please try again later.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			
			logger.info({ userId, verificationId }, "Created new user with verification data");
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
					value: `You'll need a score of at least ${process.env.MINIMUM_SCORE || '0'} to verify.`,
				}
			)
			.setFooter({
				text: "This verification link will expire in 30 minutes.",
			});

		// Construct the verification URL
		const publicFrontendUrl = process.env.PUBLIC_FRONTEND_URL;
		if (!publicFrontendUrl) {
			logger.error("PUBLIC_FRONTEND_URL environment variable is not set!");
			await interaction.reply({
				content: "Configuration error. Please contact an administrator.",
				flags: MessageFlags.Ephemeral,
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
		await interaction.reply({
			embeds: [embed],
			components: [row],
			flags: MessageFlags.Ephemeral,
		});

		logger.info(
			{ userId, verificationId, interactionToken },
			"Created verification session for user"
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
 * Handles the passport status command
 * Returns the user's current verification status
 */
export async function handleStatusCommand(
	interaction: ChatInputCommandInteraction
): Promise<void> {
	try {
		const userId = interaction.user.id;
		
		// Get the user from the database
		const user = await extendedDynamoDB.getUser(userId);
		
		if (!user) {
			await interaction.reply({
				content: "You haven't started the Human Passport verification process yet. Use `/human verify` to begin.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		
		const humanPassport = user.humanPassport;
		
		// Build status message based on the user's verification status
		let title = "Human Passport Status";
		let color = 0xFFCC00; // Default yellow for in-progress
		let description = "";
		let fields = [];
		
		if (!humanPassport) {
			// User exists but no verification data
			description = "You haven't started the Human Passport verification process yet. Use `/human verify` to begin.";
		} else {
			const statusMap: Record<string, string> = {
				[VERIFICATION_STATUS.PENDING]: "Pending - Waiting for you to connect your wallet",
				[VERIFICATION_STATUS.SIGNATURE_RECEIVED]: "Processing - Verifying your passport score",
				[VERIFICATION_STATUS.VERIFICATION_COMPLETE]: "Verified - You've successfully verified your human status",
				[VERIFICATION_STATUS.VERIFICATION_FAILED]: "Failed - Your passport score did not meet the requirements",
				[VERIFICATION_STATUS.ERROR]: "Error - Something went wrong during verification"
			};
			
			const status = statusMap[humanPassport.status] || humanPassport.status;
			
			if (humanPassport.status === VERIFICATION_STATUS.VERIFICATION_COMPLETE) {
				color = 0x00FF00; // Green for success
				title = "Human Passport Verification Complete";
				description = "You've successfully verified your human status.";
				
				fields.push({ 
					name: "Score", 
					value: humanPassport.score?.toString() || "Unknown",
					inline: true
				});
				
				fields.push({
					name: "Verified On",
					value: humanPassport.lastVerificationTime 
						? new Date(humanPassport.lastVerificationTime).toLocaleDateString() 
						: "Unknown",
					inline: true
				});
				
				if (user.walletAddress) {
					fields.push({
						name: "Wallet",
						value: `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`,
						inline: true
					});
				}
			} else if (humanPassport.status === VERIFICATION_STATUS.VERIFICATION_FAILED) {
				color = 0xFF0000; // Red for failure
				title = "Human Passport Verification Failed";
				description = "Your passport score did not meet the requirements.";
				
				if (humanPassport.score !== null && humanPassport.score !== undefined) {
					fields.push({
						name: "Your Score",
						value: humanPassport.score.toString(),
						inline: true
					});
				}
				
				fields.push({
					name: "Required Score",
					value: process.env.MINIMUM_SCORE || "0",
					inline: true
				});
				
				fields.push({
					name: "What's Next?", 
					value: "You can try again with `/human verify` to create a new verification link."
				});
			} else if (humanPassport.status === VERIFICATION_STATUS.ERROR) {
				color = 0xFF0000; // Red for error
				title = "Human Passport Verification Error";
				description = "Something went wrong during your verification process. Please try again.";
				
				fields.push({
					name: "What's Next?", 
					value: "You can try again with `/human verify` to create a new verification link."
				});
			} else {
				// In progress
				description = "Your Human Passport verification is in progress.";
				
				fields.push({
					name: "Current Status",
					value: status
				});
				
				// If verification is pending or in progress, provide a new link
				if ([VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.SIGNATURE_RECEIVED].includes(humanPassport.status as any)) {
					if (humanPassport.verificationId) {
						const publicFrontendUrl = process.env.PUBLIC_FRONTEND_URL;
						if (publicFrontendUrl) {
							fields.push({
								name: "Continue Verification",
								value: `[Click here to continue the verification process](${publicFrontendUrl}/?verificationId=${humanPassport.verificationId})`
							});
						}
					}
				}
			}
		}
		
		// Create the embed
		const embed = new EmbedBuilder()
			.setColor(color)
			.setTitle(title)
			.setDescription(description);
			
		if (fields.length > 0) {
			embed.addFields(fields);
		}
		
		// Add a footer with time
		embed.setFooter({
			text: `Status as of ${new Date().toLocaleString()}`
		});
		
		// Send the status embed
		await interaction.reply({
			embeds: [embed],
			flags: MessageFlags.Ephemeral,
		});
		
	} catch (error: any) {
		logger.error(
			error,
			"Error handling passport status command"
		);
		
		await interaction.reply({
			content: "An error occurred while checking your verification status. Please try again later.",
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
		case PassportSubcommands.Status:
			await handleStatusCommand(interaction);
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

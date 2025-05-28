import {
	ChatInputCommandInteraction,
	EmbedBuilder,
} from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { clientPromise } from "@sparta/utils/openapi/api/axios";
// import { hasModeratorRole } from "../../utils/roles"; // Assuming a utility for moderator role check

// Load environment variables
dotenv.config();

/**
 * Approves a node operator and adds their validator in a single command.
 * Intended for moderator use.
 */
export async function addValidator(
	interaction: ChatInputCommandInteraction
): Promise<string | void> {

	// Initialize variables outside try block for error handling
	let targetDiscordUsername: string | null = null;

	try {
		// Get Discord username and user ID from options
		targetDiscordUsername = interaction.options.getString("username");
		const targetDiscordUserId = interaction.options.getString("user-id");
		const validatorAddress = interaction.options.getString("validator-address", true);

		// Validate that at least one parameter is provided
		if (!targetDiscordUsername && !targetDiscordUserId) {
			await interaction.editReply("Please provide either a Discord username or Discord ID.");
			return;
		}

		// If no username but user ID provided, try to fetch username from Discord
		if (!targetDiscordUsername && targetDiscordUserId) {
			try {
				const user = await interaction.guild?.members.fetch(targetDiscordUserId);
				if (!user) {
					await interaction.editReply("User not found with the provided Discord ID.");
					return;
				}
				targetDiscordUsername = user.user.username;
			} catch (fetchError) {
				await interaction.editReply("Unable to fetch user information from the provided Discord ID.");
				return;
			}
		}

		// At this point, targetDiscordUsername should be defined
		if (!targetDiscordUsername) {
			await interaction.editReply("Unable to determine Discord username.");
			return;
		}

		// Validate validator address format
		if (!/^^0x[a-fA-F0-9]{40}$/.test(validatorAddress)) {
			await interaction.editReply("Invalid Ethereum address format for validator.");
			return "Invalid address format";
		}

		const client = await clientPromise;

		// ---- 1. Approve Operator ----
		try {
			logger.info(`Attempting to approve operator: ${targetDiscordUsername}`);
			await client.approveOperator(
				{
					discordUsername: targetDiscordUsername,
				},
				null // No body data for approval
			);
			logger.info(`Operator ${targetDiscordUsername} approved successfully.`);
		} catch (approvalError: any) {
			logger.error(`Error approving operator ${targetDiscordUsername}:`, approvalError.response?.data || approvalError.message);
			if (approvalError.response && approvalError.response.status === 404) {
				const errorEmbed = new EmbedBuilder()
					.setTitle("❌ OPERATOR APPROVAL FAILED")
					.setColor(0xff0000)
					.setDescription(`No node operator found with Discord username: \`${targetDiscordUsername}\`. They need to register first.`)
					.setTimestamp()
					.setFooter({ text: "Aztec Network Operator Management" });
				await interaction.editReply({ embeds: [errorEmbed] });
				return "Approval failed - Operator not found";
			}
			const errorEmbed = new EmbedBuilder()
				.setTitle("❌ OPERATOR APPROVAL FAILED")
				.setColor(0xff0000)
				.setDescription(`An error occurred while trying to approve \`${targetDiscordUsername}\`.`)
				.addFields({ name: "Details", value: approvalError.message || "Please check logs."})
				.setTimestamp()
				.setFooter({ text: "Aztec Network Operator Management" });
			await interaction.editReply({ embeds: [errorEmbed] });
			return "Approval error";
		}

		// ---- 2. Fetch Operator Details (to get ID and check existing validators) ----
		let operatorData;
		let targetDiscordId: string;
		try {
			const operatorResponse = await client.getOperator({
				discordUsername: targetDiscordUsername,
			});
			operatorData = operatorResponse.data;

			if (!operatorData || !operatorData.discordId) {
				logger.error(`Could not retrieve operator details or ID for ${targetDiscordUsername} after approval.`);
				const errorEmbed = new EmbedBuilder()
					.setTitle("❌ DATA FETCH FAILED")
					.setColor(0xff0000)
					.setDescription(`Failed to retrieve operator details for \`${targetDiscordUsername}\` after approval. Cannot proceed with validator addition.`)
					.setTimestamp()
					.setFooter({ text: "Aztec Network Operator Management" });
				await interaction.editReply({ embeds: [errorEmbed] });
				return "Error fetching operator details post-approval";
			}
			targetDiscordId = operatorData.discordId;
			logger.info(`Fetched operator details for ${targetDiscordUsername}, Discord ID: ${targetDiscordId}`);

		} catch (fetchError: any) {
			logger.error(`Error fetching operator details for ${targetDiscordUsername}:`, fetchError.response?.data || fetchError.message);
			const errorEmbed = new EmbedBuilder()
				.setTitle("❌ DATA FETCH FAILED")
				.setColor(0xff0000)
				.setDescription(`Could not fetch details for operator \`${targetDiscordUsername}\`.`)
				.addFields({ name: "Details", value: fetchError.message || "Please check logs."})
				.setTimestamp()
				.setFooter({ text: "Aztec Network Operator Management" });
			await interaction.editReply({ embeds: [errorEmbed] });
			return "Error fetching operator data";
		}
		
		// ---- 4. Add Validator ----
		try {
			logger.info(`Attempting to add validator ${validatorAddress} for operator ${targetDiscordUsername} (ID: ${targetDiscordId})`);
			await client.addValidator(
				{
					discordId: targetDiscordId,
					discordUsername: targetDiscordUsername,
				},
				{
					validatorAddress,
				}
			);
			logger.info(`Successfully added validator ${validatorAddress} for ${targetDiscordUsername}.`);

			// ---- 5. Success Notification & DM ----
			const displayAddress = `${validatorAddress.slice(0, 6)}...${validatorAddress.slice(-4)}`;
			const successEmbed = new EmbedBuilder()
				.setTitle(`✅ Operator Approved & Validator Added`)
				.setColor(0x00ff00) // Green for success
				.setTimestamp()
				.setFooter({ text: "Sparta Validator Registration" })
				.setDescription(`Operator \`${targetDiscordUsername}\` has been approved and validator \`${displayAddress}\` added successfully.`)
				.addFields(
					{ name: "Operator", value: targetDiscordUsername, inline: true },
					{ name: "Validator Address", value: validatorAddress, inline: false },
					{ name: "Status", value: "Approved and Validator Added", inline: true }
				);

			// Send DM to the operator
			const dmContent = `Hear ye, hear ye, brave Spartan warrior! 🛡️ A moderator has **APPROVED** your entry and **ADDED** your validator to the Aztec network!\n\nYour validator address: \`${validatorAddress}\` is now registered.\n\n- Keep your shield up and your validator sharp! You can check its readiness with \`/operator my-stats\`.\n- A true Spartan upholds the line! Neglecting your duties could lead to your validator being slashed.\n\nShould you need guidance, seek aid in this channel or message <@411954463541166080> (my creator) directly.\n\nVictory favors the prepared! This is SPARTAAAA! 💪`;
			const dmThreadName = `Auto-Notification: Approved & Validator Added - ${targetDiscordUsername}`;
			let dmStatusMessage = "A direct message has been sent to the operator.";

			try {
				const messageApiResponse = await client.sendMessageToOperator(
					{ discordUsername: targetDiscordUsername },
					{ message: dmContent, threadName: dmThreadName }
				);
				if (messageApiResponse.data.success) {
					logger.info(`Successfully sent combined approval & add DM to ${targetDiscordUsername}.`);
				} else {
					logger.error(`Failed to send combined DM to ${targetDiscordUsername} via API: ${messageApiResponse.data.message || 'Unknown API error'}`);
					dmStatusMessage = "Attempted to send DM to operator, but it may have failed. See logs.";
				}
			} catch (dmError: any) {
				logger.error(`Exception sending combined DM to ${targetDiscordUsername}:`, dmError.response?.data || dmError.message);
				dmStatusMessage = "Error during DM attempt to operator. See logs.";
			}
			successEmbed.addFields({ name: "Operator Notification", value: dmStatusMessage });

			await interaction.editReply({ embeds: [successEmbed] });
			return "Operator approved and validator added successfully.";

		} catch (addValidatorError: any) {
			logger.error(addValidatorError.response?.data || addValidatorError.message, `Error adding validator ${validatorAddress} for ${targetDiscordUsername}:`);
			const errorEmbed = new EmbedBuilder()
				.setTitle(`❌ Validator Addition Failed for ${targetDiscordUsername}`)
				.setColor(0xff0000)
				.setTimestamp()
				.setFooter({ text: "Sparta Validator Registration" });

			if (addValidatorError.response) {
				if (addValidatorError.response.data.error.includes("Staking__AlreadyRegistered")) {
					errorEmbed.setDescription(`Behold!Validator \`${validatorAddress}\` is already registered on the smart contract for \`${targetDiscordUsername}\`, but I may not know about it. Please reach out to the moderator team. Stay strong!`);
				} else {
					switch (addValidatorError.response.status) {
						case 400:
							errorEmbed.setDescription(`Invalid validator address format provided for \`${targetDiscordUsername}\`: \`${validatorAddress}\`.`);
							break;
						case 403:
							// Check if it's a slashing error or other forbidden operation
							if (addValidatorError.response.data && addValidatorError.response.data.error === "Operator was slashed") {
								errorEmbed.setDescription(`The operator \`${targetDiscordUsername}\` was previously slashed and cannot add validators.`);
							} else {
								errorEmbed.setDescription(`Operation forbidden for operator \`${targetDiscordUsername}\` when attempting to add validator. They may have restrictions or require further actions.`);
							}
							break;
						case 404: // This would be unusual if getOperator succeeded
							errorEmbed.setDescription(`Operator \`${targetDiscordUsername}\` not found during validator addition. Please verify their status.`);
							break;
						case 401:
							errorEmbed.setDescription(`Authentication error while adding validator for \`${targetDiscordUsername}\`. Please try again later.`);
							break;
						default:
								errorEmbed.setDescription(`An error occurred while adding validator for \`${targetDiscordUsername}\`. Please try again later.`);
					}
				}
			} else {
				errorEmbed.setDescription(`Connection error while adding validator for \`${targetDiscordUsername}\`. Please try again later.`);
			}
			await interaction.editReply({ embeds: [errorEmbed] });
			return "Error adding validator";
		}

	} catch (error: any) {
		logger.error(`Unexpected error in operatorAdd command for ${targetDiscordUsername || 'unknown user'}:`, error);
		await interaction.editReply({
			content: "An unexpected error occurred. Please try again later or check the logs.",
		});
		return "Unexpected error in operatorAdd command";
	}
}

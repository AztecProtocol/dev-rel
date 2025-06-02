import {
	ChatInputCommandInteraction,
	EmbedBuilder,
} from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { clientPromise } from "@sparta/utils/openapi/api/axios";

// Load environment variables
dotenv.config();

/**
 * Adds multiple validators to an approved operator in a single command.
 * Intended for moderator use.
 */
export async function addMultipleValidators(
	interaction: ChatInputCommandInteraction
): Promise<string | void> {

	// Initialize variables outside try block for error handling
	let targetDiscordUsername: string | null = null;

	try {
		// Get Discord username and user ID from options
		targetDiscordUsername = interaction.options.getString("username");
		const targetDiscordUserId = interaction.options.getString("user-id");
		const validatorAddressesString = interaction.options.getString("validator-addresses", true);

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

		// Parse and validate validator addresses
		const validatorAddresses = validatorAddressesString
			.split(',')
			.map(addr => addr.trim())
			.filter(addr => addr.length > 0);

		if (validatorAddresses.length === 0) {
			await interaction.editReply("No valid validator addresses provided.");
			return;
		}

		// Validate each validator address format
		const invalidAddresses = validatorAddresses.filter(addr => !/^0x[a-fA-F0-9]{40}$/.test(addr));
		if (invalidAddresses.length > 0) {
			await interaction.editReply(`Invalid Ethereum address format for validators: ${invalidAddresses.join(', ')}`);
			return "Invalid address format";
		}

		const client = await clientPromise;

		// ---- 1. Approve Operator ----
		let operatorWasAlreadyApproved = false;
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
			
			// Check if operator is already approved - this should not block the flow
			// Only allow this specific 400 error to proceed, not any 400 status
			if (approvalError.response && 
				approvalError.response.status === 400 && 
				approvalError.response.data?.error === "Operator is already approved") {
				logger.info(`Operator ${targetDiscordUsername} is already approved, continuing with validator addition.`);
				operatorWasAlreadyApproved = true;
			} else if (approvalError.response && approvalError.response.status === 404) {
				const errorEmbed = new EmbedBuilder()
					.setTitle("❌ OPERATOR APPROVAL FAILED")
					.setColor(0xff0000)
					.setDescription(`No node operator found with Discord username: \`${targetDiscordUsername}\`. They need to register first.`)
					.setTimestamp()
					.setFooter({ text: "Aztec Network Operator Management" });
				await interaction.editReply({ embeds: [errorEmbed] });
				return "Approval failed - Operator not found";
			} else {
				// Handle all other errors (including other 400 errors) as failures
				const errorEmbed = new EmbedBuilder()
					.setTitle("❌ OPERATOR APPROVAL FAILED")
					.setColor(0xff0000)
					.setDescription(`An error occurred while trying to approve \`${targetDiscordUsername}\`.`)
					.addFields({ name: "Details", value: approvalError.response?.data?.error || approvalError.message || "Please check logs."})
					.setTimestamp()
					.setFooter({ text: "Aztec Network Operator Management" });
				await interaction.editReply({ embeds: [errorEmbed] });
				return "Approval error";
			}
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
		
		// ---- 3. Add Multiple Validators ----
		const results: Array<{address: string, success: boolean, error?: string}> = [];
		const successfulAddresses: string[] = [];
		const failedAddresses: Array<{address: string, error: string}> = [];

		for (const validatorAddress of validatorAddresses) {
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
				results.push({ address: validatorAddress, success: true });
				successfulAddresses.push(validatorAddress);

			} catch (addValidatorError: any) {
				logger.error(addValidatorError.response?.data || addValidatorError.message, `Error adding validator ${validatorAddress} for ${targetDiscordUsername}:`);
				
				let errorMessage = "Unknown error";
				if (addValidatorError.response) {
					if (addValidatorError.response.data.error.includes("Staking__AlreadyRegistered")) {
						errorMessage = "Already registered on smart contract";
					} else {
						switch (addValidatorError.response.status) {
							case 400:
								errorMessage = "Invalid validator address format";
								break;
							case 403:
								if (addValidatorError.response.data && addValidatorError.response.data.error === "Operator was slashed") {
									errorMessage = "Operator was slashed";
								} else {
									errorMessage = "Operation forbidden";
								}
								break;
							case 404:
								errorMessage = "Operator not found";
								break;
							case 401:
								errorMessage = "Authentication error";
								break;
							default:
								errorMessage = "Server error";
						}
					}
				} else {
					errorMessage = "Connection error";
				}
				
				results.push({ address: validatorAddress, success: false, error: errorMessage });
				failedAddresses.push({ address: validatorAddress, error: errorMessage });
			}
		}

		// ---- 4. Create Results Summary ----
		const approvalStatus = operatorWasAlreadyApproved ? "Already Approved" : "Newly Approved";
		const titleText = successfulAddresses.length > 0 ? 
			(operatorWasAlreadyApproved ? 
				`✅ Multiple Validators Added (${successfulAddresses.length}/${validatorAddresses.length})` : 
				`✅ Operator Approved & Multiple Validators Added (${successfulAddresses.length}/${validatorAddresses.length})`) :
			`❌ Failed to Add Validators`;
		
		const successColor = successfulAddresses.length === validatorAddresses.length ? 0x00ff00 : 
						   successfulAddresses.length > 0 ? 0xffa500 : 0xff0000;

		const embed = new EmbedBuilder()
			.setTitle(titleText)
			.setColor(successColor)
			.setTimestamp()
			.setFooter({ text: "Sparta Validator Registration" })
			.addFields(
				{ name: "Operator", value: targetDiscordUsername, inline: true },
				{ name: "Status", value: approvalStatus, inline: true },
				{ name: "Total Addresses", value: validatorAddresses.length.toString(), inline: true }
			);

		if (successfulAddresses.length > 0) {
			const displayAddresses = successfulAddresses.map(addr => 
				`• \`${addr.slice(0, 6)}...${addr.slice(-4)}\``
			).join('\n');
			embed.addFields({ 
				name: `✅ Successfully Added (${successfulAddresses.length})`, 
				value: displayAddresses.length > 1024 ? `${successfulAddresses.length} validators added successfully` : displayAddresses,
				inline: false 
			});
		}

		if (failedAddresses.length > 0) {
			const displayFailures = failedAddresses.map(item => 
				`• \`${item.address.slice(0, 6)}...${item.address.slice(-4)}\` - ${item.error}`
			).join('\n');
			embed.addFields({ 
				name: `❌ Failed (${failedAddresses.length})`, 
				value: displayFailures.length > 1024 ? `${failedAddresses.length} validators failed to add` : displayFailures,
				inline: false 
			});
		}

		// ---- 5. Send DM to operator if any validators were added successfully ----
		if (successfulAddresses.length > 0) {
			const dmActionText = operatorWasAlreadyApproved ? "**ADDED** multiple validators" : "**APPROVED** your entry and **ADDED** multiple validators";
			const validatorList = successfulAddresses.map(addr => `\`${addr}\``).join('\n');
			const dmContent = `Hear ye, hear ye, brave Spartan warrior! 🛡️ A moderator has ${dmActionText} to the Aztec network!\n\nYour validator addresses:\n${validatorList}\n\n- Keep your shields up and your validators sharp! You can check their readiness with \`/operator my-stats\`.\n- A true Spartan upholds the line! Neglecting your duties could lead to your validators being slashed.\n\nShould you need guidance, seek aid in this channel or message <@411954463541166080> (my creator) directly.\n\nVictory favors the prepared! This is SPARTAAAA! 💪`;
			const dmThreadName = operatorWasAlreadyApproved ? 
				`Auto-Notification: Multiple Validators Added - ${targetDiscordUsername}` :
				`Auto-Notification: Approved & Multiple Validators Added - ${targetDiscordUsername}`;
			let dmStatusMessage = "A direct message has been sent to the operator.";

			try {
				const messageApiResponse = await client.sendMessageToOperator(
					{ discordUsername: targetDiscordUsername },
					{ message: dmContent, threadName: dmThreadName }
				);
				if (messageApiResponse.data.success) {
					logger.info(`Successfully sent multiple validators DM to ${targetDiscordUsername}.`);
				} else {
					logger.error(`Failed to send multiple validators DM to ${targetDiscordUsername} via API: ${messageApiResponse.data.message || 'Unknown API error'}`);
					dmStatusMessage = "Attempted to send DM to operator, but it may have failed. See logs.";
				}
			} catch (dmError: any) {
				logger.error(`Exception sending multiple validators DM to ${targetDiscordUsername}:`, dmError.response?.data || dmError.message);
				dmStatusMessage = "Error during DM attempt to operator. See logs.";
			}
			embed.addFields({ name: "Operator Notification", value: dmStatusMessage });
		}

		await interaction.editReply({ embeds: [embed] });
		
		if (successfulAddresses.length === validatorAddresses.length) {
			return "All validators added successfully.";
		} else if (successfulAddresses.length > 0) {
			return `Partially successful: ${successfulAddresses.length}/${validatorAddresses.length} validators added.`;
		} else {
			return "Failed to add any validators.";
		}

	} catch (error: any) {
		logger.error(`Unexpected error in addMultipleValidators command for ${targetDiscordUsername || 'unknown user'}:`, error);
		await interaction.editReply({
			content: "An unexpected error occurred. Please try again later or check the logs.",
		});
		return "Unexpected error in addMultipleValidators command";
	}
} 
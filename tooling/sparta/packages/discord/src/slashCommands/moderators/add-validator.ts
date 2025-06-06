import {
	ChatInputCommandInteraction,
	EmbedBuilder,
} from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { clientPromise } from "@sparta/utils/openapi/api/axios";
import { resolveDiscordIdForApi } from "../../utils/discordIdResolver";
import type { Components } from "@sparta/utils/openapi/types"; // Import the Components namespace
// import { hasModeratorRole } from "../../utils/roles"; // Assuming a utility for moderator role check

// Load environment variables
dotenv.config();

/**
 * Adds validator(s) to an operator. The operator will be created automatically if it doesn't exist.
 * Supports single or multiple comma-separated validator addresses.
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
		const validatorAddressesString = interaction.options.getString("validator-addresses", true);

		// Validate that at least one parameter is provided
		if (!targetDiscordUsername && !targetDiscordUserId) {
			await interaction.editReply("Please provide either a Discord username or Discord ID.");
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

		// Resolve Discord user information
		const targetDiscordId = await resolveDiscordIdForApi(targetDiscordUsername, targetDiscordUserId);
		
		if (!targetDiscordId) {
			await interaction.editReply("Unable to resolve Discord user. Please check the username or user ID.");
			return "User resolution failed";
		}

		// If we didn't have a username but resolved one, try to get it for display purposes
		if (!targetDiscordUsername && targetDiscordId) {
			try {
				const user = await interaction.guild?.members.fetch(targetDiscordId);
				if (user) {
					targetDiscordUsername = user.user.username;
				}
			} catch (fetchError) {
				// Not critical if we can't get the username for display
				targetDiscordUsername = `User-${targetDiscordId}`;
			}
		}

		const client = await clientPromise;

		// ---- Add Validator(s) (Operator will be created automatically if needed) ----
		const results: Array<{address: string, success: boolean, error?: string}> = [];
		const successfulAddresses: string[] = [];
		const failedAddresses: Array<{address: string, error: string}> = [];
		let operatorWasCreated = false;

		for (const validatorAddress of validatorAddresses) {
			try {
				logger.info(`Attempting to add validator ${validatorAddress} for operator ${targetDiscordUsername} (ID: ${targetDiscordId})`);
				const response = await client.addValidator(
					{
						discordId: targetDiscordId,
					},
					{
						validatorAddress,
					}
				);
				
				// Check if this was the first successful call and if operator was newly created
				if (!operatorWasCreated && (response.data?.data as any)?.operator?.createdAt) {
					// If the operator's createdAt is very recent (within last minute), it was likely just created
					const operatorAge = Date.now() - (response.data.data as any).operator.createdAt;
					if (operatorAge < 60000) { // Less than 1 minute old
						operatorWasCreated = true;
						logger.info(`Operator ${targetDiscordUsername} appears to have been created during validator addition`);
					}
				}
				
				logger.info(`Successfully added validator ${validatorAddress} for ${targetDiscordUsername}.`);
				results.push({ address: validatorAddress, success: true });
				successfulAddresses.push(validatorAddress);

			} catch (addValidatorError: any) {
				logger.error(addValidatorError.response?.data || addValidatorError.message, `Error adding validator ${validatorAddress} for ${targetDiscordUsername}:`);
				
				let errorMessage = "Unknown error";
				if (addValidatorError.response) {
					if (addValidatorError.response.data?.error?.includes("Staking__AlreadyRegistered")) {
						errorMessage = "Already registered on smart contract";
					} else {
						switch (addValidatorError.response.status) {
							case 400:
								errorMessage = "Invalid validator address format";
								break;
							case 403:
								errorMessage = "Operation forbidden";
								
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

		// ---- Success/Error Notification & DM ----
		const creationStatus = operatorWasCreated ? "Newly Created" : "Already Exists";
		const isMultiple = validatorAddresses.length > 1;
		const allSuccessful = successfulAddresses.length === validatorAddresses.length;
		const someSuccessful = successfulAddresses.length > 0;
		
		let titleText: string;
		let descriptionText: string;
		let successColor: number;
		
		if (allSuccessful) {
			successColor = 0x00ff00; // Green for complete success
			if (isMultiple) {
				titleText = operatorWasCreated 
					? `✅ Operator Created & ${successfulAddresses.length} Validators Added`
					: `✅ ${successfulAddresses.length} Validators Added`;
				descriptionText = operatorWasCreated
					? `Operator \`${targetDiscordUsername}\` has been created and ${successfulAddresses.length} validators added successfully.`
					: `${successfulAddresses.length} validators have been added successfully to operator \`${targetDiscordUsername}\`.`;
			} else {
				titleText = operatorWasCreated 
					? `✅ Operator Created & Validator Added`
					: `✅ Validator Added`;
				const displayAddress = successfulAddresses[0] ? `${successfulAddresses[0].slice(0, 6)}...${successfulAddresses[0].slice(-4)}` : "Unknown";
				descriptionText = operatorWasCreated
					? `Operator \`${targetDiscordUsername}\` has been created and validator \`${displayAddress}\` added successfully.`
					: `Validator \`${displayAddress}\` has been added successfully to operator \`${targetDiscordUsername}\`.`;
			}
		} else if (someSuccessful) {
			successColor = 0xffa500; // Orange for partial success
			titleText = `⚠️ Partial Success: ${successfulAddresses.length}/${validatorAddresses.length} Validators Added`;
			descriptionText = `${successfulAddresses.length} out of ${validatorAddresses.length} validators were added successfully to operator \`${targetDiscordUsername}\`.`;
		} else {
			successColor = 0xff0000; // Red for failure
			titleText = `❌ Failed to Add ${isMultiple ? 'Validators' : 'Validator'}`;
			descriptionText = `Failed to add ${isMultiple ? 'any validators' : 'validator'} to operator \`${targetDiscordUsername}\`.`;
		}
		
		const embed = new EmbedBuilder()
			.setTitle(titleText)
			.setColor(successColor)
			.setTimestamp()
			.setFooter({ text: "Sparta Validator Registration" })
			.setDescription(descriptionText)
			.addFields(
				{ name: "Operator", value: targetDiscordUsername || `User-${targetDiscordId}`, inline: true },
				{ name: "Creation Status", value: creationStatus, inline: true },
				{ name: "Total Addresses", value: validatorAddresses.length.toString(), inline: true }
			);

		// Add successful validators field
		if (successfulAddresses.length > 0) {
			if (isMultiple) {
				const displayAddresses = successfulAddresses.map(addr => 
					`• \`${addr.slice(0, 6)}...${addr.slice(-4)}\``
				).join('\n');
				embed.addFields({ 
					name: `✅ Successfully Added (${successfulAddresses.length})`, 
					value: displayAddresses.length > 1024 ? `${successfulAddresses.length} validators added successfully` : displayAddresses,
					inline: false 
				});
			} else {
				embed.addFields({ 
					name: "Validator Address", 
					value: successfulAddresses[0] || "Unknown", 
					inline: false 
				});
			}
		}

		// Add failed validators field
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

		// Send DM to the operator if any validators were added successfully
		if (successfulAddresses.length > 0) {
			let dmActionText: string;
			if (operatorWasCreated) {
				dmActionText = isMultiple 
					? "**REGISTERED** you as an operator and **ADDED** your validators"
					: "**REGISTERED** you as an operator and **ADDED** your validator";
			} else {
				dmActionText = isMultiple 
					? "**ADDED** your validators"
					: "**ADDED** your validator";
			}
			
			const validatorList = isMultiple 
				? successfulAddresses.map(addr => `\`${addr}\``).join('\n')
				: `\`${successfulAddresses[0] || "Unknown"}\``;
			
			const dmContent = `Hear ye, hear ye, brave Spartan warrior! 🛡️ A moderator has ${dmActionText} to the Aztec network!\n\nYour validator ${isMultiple ? 'addresses' : 'address'}:\n${validatorList}\n\n- Keep your ${isMultiple ? 'shields' : 'shield'} up and your ${isMultiple ? 'validators' : 'validator'} sharp! You can check ${isMultiple ? 'their' : 'its'} readiness with \`/operator my-stats\`.\n- A true Spartan upholds the line! Neglecting your duties could lead to your ${isMultiple ? 'validators' : 'validator'} being slashed.\n\nShould you need guidance, seek aid in the support channels.\n\nVictory favors the prepared! This is SPARTAAAA! 💪`;
			let dmStatusMessage = "A direct message has been initiated for the operator.";

			try {
				// First, get the operator's address to send the DM
				const operatorResponse = await client.getOperatorBySocials({ discordId: targetDiscordId });
				const operator = operatorResponse.data as Components.Schemas.NodeOperator | undefined;

				if (operator && operator.address) {
					const messageApiResponse = await client.sendMessageToOperator(
						{ address: operator.address }, // Use address here
						{ message: dmContent }
					);
					if (messageApiResponse.data.success) {
						logger.info(`Successfully sent DM to ${targetDiscordUsername} (Address: ${operator.address}).`);
						dmStatusMessage = "A direct message has been sent to the operator.";
					} else {
						logger.error(`Failed to send DM to ${targetDiscordUsername} (Address: ${operator.address}) via API: ${messageApiResponse.data.message || 'Unknown API error'}`);
						dmStatusMessage = "Attempted to send DM to operator, but it may have failed. See logs.";
					}
				} else {
					logger.warn(`Could not find operator or operator address for Discord ID ${targetDiscordId} to send DM.`);
					dmStatusMessage = "Could not send DM: Operator details not found.";
				}
			} catch (dmError: any) {
				logger.error(`Exception sending DM to ${targetDiscordUsername}:`, dmError.response?.data || dmError.message);
				dmStatusMessage = "Error during DM attempt to operator. See logs.";
			}
			embed.addFields({ name: "Operator Notification", value: dmStatusMessage });
		}

		await interaction.editReply({ embeds: [embed] });
		
		// Return appropriate success message
		if (allSuccessful) {
			return isMultiple 
				? (operatorWasCreated ? "Operator created and validators added successfully." : "Validators added successfully.")
				: (operatorWasCreated ? "Operator created and validator added successfully." : "Validator added successfully.");
		} else if (someSuccessful) {
			return `Partially successful: ${successfulAddresses.length}/${validatorAddresses.length} validators added.`;
		} else {
			return "Failed to add validators";
		}

	} catch (error: any) {
		logger.error(`Unexpected error in addValidator command for ${targetDiscordUsername || 'unknown user'}:`, error);
		await interaction.editReply({
			content: "An unexpected error occurred. Please try again later or check the logs.",
		});
		return "Unexpected error in addValidator command";
	}
}

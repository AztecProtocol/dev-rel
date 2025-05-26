import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	GuildMember,
} from "discord.js";
import { logger } from "@sparta/utils";
import { clientPromise } from "@sparta/utils/openapi/api/axios";
import { hasGuardianRole } from "../../utils/roles";

/**
 * Handle the "add-validator" subcommand to add a new validator
 */
export async function addValidator(
	interaction: ChatInputCommandInteraction
): Promise<string | void> {
	await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});

	// Check if the user has the Guardian role
	const member = interaction.member as GuildMember;
	if (!member) {
		await interaction.editReply({
			content: "Could not verify your server membership. Please try again.",
		});
		return "Failed to verify server membership";
	}

	if (!hasGuardianRole(member)) {
		await interaction.editReply({
			content: "You don't have permission to use this command",
		});
		return "Permission denied - Guardian role required";
	}

	try {
		// Get parameters from the command options
		const validatorAddress = interaction.options.getString("validator-address");

		// Validate address format
		if (!validatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(validatorAddress)) {
			await interaction.editReply("Invalid Ethereum address format.");
			return "Invalid address format";
		}

		// Get Discord user ID from interaction
		const discordId = interaction.user.id;
		const discordUsername = interaction.user.username;

		try {
			// Get API client
			const client = await clientPromise;
			
			// First, get the node operator to check if they already have validators
			const operatorResponse = await client.getOperator({
				discordId
			});

			// Check if the operator already has validators
			const operatorData = operatorResponse.data;
			if (operatorData && operatorData.validators && operatorData.validators.length > 0) {
				// Create error embed for the case when operator already has validators
				const errorEmbed = new EmbedBuilder()
					.setTitle(`Validator Addition Failed`)
					.setColor(0xff0000) // Red for failure
					.setTimestamp()
					.setFooter({ text: "Sparta Validator Registration" })
					.setDescription("You already have one or more validators registered. Only one validator is allowed per operator.");
				
				await interaction.editReply({ embeds: [errorEmbed] });
				return "Error: Operator already has validators";
			}

			// Call the POST /api/operator/validator endpoint
			await client.addValidator(
				{
					discordId,
					discordUsername,
				},
				{
					validatorAddress,
				}
			);

			// Create a Discord embed for the result
			const embed = new EmbedBuilder()
				.setTitle(`Validator Added`)
				.setColor(0x00ff00) // Green for success
				.setTimestamp()
				.setFooter({ text: "Sparta Validator Registration" });

			const displayAddress = `${validatorAddress.slice(0, 6)}...${validatorAddress.slice(-4)}`; // Shortened address

			embed.setDescription(
				`✅ **New validator ${displayAddress} added successfully!**`
			);
			embed.addFields(
				{
					name: "Validator Address",
					value: validatorAddress,
					inline: false,
				},
				{
					name: "Status",
					value: "Validator added",
					inline: true,
				}
			);

			await interaction.editReply({ embeds: [embed] });
			return "Validator added successfully";

		} catch (apiError: any) {
			logger.error(apiError, "Error with operator API");

			// Create error embed
			const errorEmbed = new EmbedBuilder()
				.setTitle(`Validator Addition Failed`)
				.setColor(0xff0000) // Red for failure
				.setTimestamp()
				.setFooter({ text: "Sparta Validator Registration" });

			// Add appropriate error message based on error status
			if (apiError.response) {
				switch (apiError.response.status) {
					case 400:
						errorEmbed.setDescription("Invalid validator address format.");
						break;
					case 403:
						errorEmbed.setDescription("Your account requires approval before adding validators.");
						break;
					case 404:
						errorEmbed.setDescription("Node operator not found. Please register as an operator first.");
						break;
					case 401:
						errorEmbed.setDescription("Authentication error. Please try again later.");
						break;
					default:
						errorEmbed.setDescription("An error occurred while adding the validator. Please try again later.");
				}
			} else {
				errorEmbed.setDescription("Connection error. Please try again later.");
			}

			await interaction.editReply({ embeds: [errorEmbed] });
			return "Error adding validator";
		}
	} catch (error) {
		logger.error("Failed to add validator:", error);
		await interaction.editReply({
			content: "An unexpected error occurred. Please try again later.",
		});
		return "Unexpected error adding validator";
	}
} 
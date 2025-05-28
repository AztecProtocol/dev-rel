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
			content: "⚔️ Cannot verify your Spartan identity, warrior! Please retry your request.",
		});
		return "Failed to verify server membership";
	}

	if (!hasGuardianRole(member)) {
		await interaction.editReply({
			content: "🛡️ You lack the Guardian rank to deploy new validators, warrior!",
		});
		return "Permission denied - Guardian role required";
	}

	try {
		// Get parameters from the command options
		const validatorAddress = interaction.options.getString("validator-address");

		// Validate address format
		if (!validatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(validatorAddress)) {
			await interaction.editReply("⚔️ Invalid battle address format, warrior! Ensure it follows Ethereum standards.");
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
					.setTitle(`⚔️ VALIDATOR DEPLOYMENT DENIED`)
					.setColor(0xff0000) // Red for failure
					.setTimestamp()
					.setFooter({ text: "Aztec Network • Spartan Defense Force" })
					.setDescription("🏛️ **You already command validators on the battlefield!** Spartan protocol allows only one validator per warrior to maintain formation discipline.");
				
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
				.setTitle(`⚔️ VALIDATOR DEPLOYED TO BATTLE`)
				.setColor(0x8B0000) // Deep red for Spartan success
				.setTimestamp()
				.setFooter({ text: "Aztec Network • Spartan Defense Force" });

			const displayAddress = `${validatorAddress.slice(0, 6)}...${validatorAddress.slice(-4)}`; // Shortened address

			embed.setDescription(
				`🛡️ **New warrior ${displayAddress} deployed to the front lines!**\n⚔️ Your validator has joined the Spartan formation.`
			);
			embed.addFields(
				{
					name: "🏺 Validator Battle Address",
					value: validatorAddress,
					inline: false,
				},
				{
					name: "⚡ Deployment Status",
					value: "🗡️ **Ready for Combat** - Awaiting battle orders",
					inline: true,
				}
			);

			await interaction.editReply({ embeds: [embed] });
			return "Spartan validator deployed successfully";

		} catch (apiError: any) {
			logger.error(apiError, "Error with operator API");

			// Create error embed
			const errorEmbed = new EmbedBuilder()
				.setTitle(`⚔️ VALIDATOR DEPLOYMENT FAILED`)
				.setColor(0xff0000) // Red for failure
				.setTimestamp()
				.setFooter({ text: "Aztec Network • Spartan Defense Force" });

			// Add appropriate error message based on error status
			if (apiError.response) {
				switch (apiError.response.status) {
					case 400:
						errorEmbed.setDescription("🏺 **Invalid battle address format!** Check your validator coordinates, warrior.");
						break;
					case 403:
						// Check if it's a slashing error or approval error
						if (apiError.response.data && apiError.response.data.error === "Operator was slashed") {
							errorEmbed.setDescription("⚔️ **Your warrior was defeated in battle!** Slashed validators cannot return to the field.");
						} else {
							errorEmbed.setDescription("🛡️ **Awaiting command approval!** Your battle readiness requires verification from Spartan leadership.");
						}
						break;
					case 404:
						errorEmbed.setDescription("🏛️ **Warrior not found in our ranks!** Complete your Spartan oath first with `/operator start`.");
						break;
					case 401:
						errorEmbed.setDescription("🔒 **Authentication failed!** Our sentries could not verify your identity, try again.");
						break;
					default:
						errorEmbed.setDescription("⚡ **Deployment systems disrupted!** Our war machines encountered an error, retry later.");
				}
			} else {
				errorEmbed.setDescription("🏛️ **Communication with command lost!** Network disruption detected, retry your deployment.");
			}

			await interaction.editReply({ embeds: [errorEmbed] });
			return "Error deploying validator";
		}
	} catch (error) {
		logger.error("Failed to add validator:", error);
		await interaction.editReply({
			content: "⚔️ Unexpected battle system failure! Our engineers are investigating, warrior.",
		});
		return "Unexpected error adding validator";
	}
} 
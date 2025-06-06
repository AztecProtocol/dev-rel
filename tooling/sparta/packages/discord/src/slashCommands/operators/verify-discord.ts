import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import { clientPromise } from "@sparta/utils/openapi/api/axios";

export async function verifyDiscordAccount(interaction: ChatInputCommandInteraction) {
	try {
		// Defer the reply as this might take a moment
		await interaction.deferReply({ ephemeral: true });

		// Get the operator address from the command
		const operatorAddress = interaction.options.getString("address", true);
		const discordId = interaction.user.id;
		const username = interaction.user.username;

		logger.info({
			discordId,
			username,
			operatorAddress
		}, "Processing Discord verification request");

		try {
			// Get the API client
			const client = await clientPromise;

			// Call the verify endpoint using the generated API method
			await client.verifyOperatorSocial(
				null, // No query parameters
				{
					social: "discord",
					id: discordId
				}
			);

			// Success! Create a success embed
			const successEmbed = new EmbedBuilder()
				.setTitle("✅ Discord Account Verified!")
				.setColor(0x00ff00)
				.setDescription(`Your Discord account has been successfully linked to your operator address.`)
				.addFields([
					{
						name: "👤 Discord User",
						value: `<@${discordId}>`,
						inline: true
					},
					{
						name: "🔗 Operator Address",
						value: `\`${operatorAddress}\``,
						inline: false
					},
					{
						name: "📅 Verified At",
						value: new Date().toLocaleString(),
						inline: true
					}
				])
				.setFooter({
					text: "Sparta Node Operator Verification"
				})
				.setTimestamp();

			await interaction.editReply({ embeds: [successEmbed] });
			logger.info({
				discordId,
				operatorAddress
			}, "Discord verification completed successfully");

		} catch (apiError: any) {
			logger.error({ 
				error: apiError, 
				discordId, 
				operatorAddress 
			}, "API error during Discord verification");

			// Handle specific error cases
			let errorMessage = "An unexpected error occurred during verification.";
			let errorTitle = "❌ Verification Failed";

			if (apiError.response) {
				const status = apiError.response.status;
				const errorData = apiError.response.data;

				if (status === 404) {
					if (errorData.error?.includes("No pending discord verification")) {
						errorTitle = "❌ No Pending Verification";
						errorMessage = "No pending Discord verification found for this operator address. Please ensure you've initiated the linking process from the dashboard first.";
					} else {
						errorTitle = "❌ Operator Not Found";
						errorMessage = `No operator found with address: \`${operatorAddress}\``;
					}
				} else if (status === 409) {
					if (errorData.error?.includes("already verified")) {
						errorTitle = "✅ Already Verified";
						errorMessage = "Your Discord account is already verified for this operator.";
					} else if (errorData.error?.includes("ID mismatch")) {
						errorTitle = "❌ Account Mismatch";
						errorMessage = "The Discord account requesting verification doesn't match the one linked during signature creation.";
					}
				} else if (status === 400) {
					errorMessage = errorData.error || "Invalid request parameters.";
				} else {
					errorMessage = errorData.error || errorMessage;
				}
			}

			const errorEmbed = new EmbedBuilder()
				.setTitle(errorTitle)
				.setColor(0xff0000)
				.setDescription(errorMessage)
				.addFields([
					{
						name: "🔍 What to do?",
						value: "1. Ensure you've initiated the linking process from the dashboard\n2. Use the exact operator address shown in the dashboard\n3. Complete verification within 24 hours of initiating",
						inline: false
					}
				])
				.setFooter({
					text: "Need help? Contact support"
				})
				.setTimestamp();

			await interaction.editReply({ embeds: [errorEmbed] });
		}

	} catch (error) {
		logger.error({ error }, "Error executing verify-discord command");
		
		const errorEmbed = new EmbedBuilder()
			.setTitle("❌ Command Error")
			.setColor(0xff0000)
			.setDescription("An unexpected error occurred while processing your request.")
			.setFooter({
				text: "Please try again or contact support"
			})
			.setTimestamp();

		await interaction.editReply({ embeds: [errorEmbed] });
	}
} 
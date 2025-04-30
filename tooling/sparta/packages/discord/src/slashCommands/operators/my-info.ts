import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { l2InfoService } from "../../services/l2-info-service";

// Load environment variables
dotenv.config();

/**
 * Handle the "check" subcommand to check if address has attested in last 24h using RPC
 */
export async function getValidatorStats(
	interaction: ChatInputCommandInteraction
) {
	try {
		await interaction.deferReply();

		// Get address from options directly instead of using the validator
		const addressOption = interaction.options.getString("address");

		if (!addressOption) {
			await interaction.editReply("Please provide an Ethereum address.");
			return;
		}

		// Validate address format
		if (!/^0x[a-fA-F0-9]{40}$/.test(addressOption)) {
			await interaction.editReply("Invalid Ethereum address format.");
			return;
		}

		const address = addressOption;

		// Fetch stats using the new RPC function
		const result = await l2InfoService.fetchValidatorStats(address);

		const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`; // Shortened address for title

		// Create a Discord embed for the result
		const embed = new EmbedBuilder()
			.setTitle(`RPC Validator Check: ${displayAddress}`)
			.setColor(
				result.error
					? 0xff0000
					: result.hasAttested24h
					? 0x00ff00
					: 0xffa500
			) // Red for error, Green for success, Orange for no recent
			.setTimestamp()
			.setFooter({ text: "Sparta RPC Validator Check" });

		if (result.error) {
			embed.setDescription(`❌ **Error:** ${result.error}`);
		} else {
			// Primary status message
			if (result.hasAttested24h) {
				embed.setDescription(
					`✅ **Validator HAS attested in the last 24 hours.**`
				);
			} else if (result.lastAttestationTimestamp) {
				embed.setDescription(
					`🟠 **Validator has NOT attested in the last 24 hours.**`
				);
			} else {
				embed.setDescription(
					`⚪️ **Validator has NO attestation history recorded by the node.**`
				);
				embed.setColor(0x808080); // Grey for no data
			}

			// Additional information fields
			const fields = [];

			if (result.lastAttestationSlot !== undefined) {
				fields.push({
					name: "Last Attestation Seen by Node",
					value: `Slot: ${result.lastAttestationSlot}\nTimestamp: ${
						result.lastAttestationTimestamp
					}\nDate: ${
						result.lastAttestationDate
							? new Date(
									result.lastAttestationDate
							  ).toLocaleString()
							: "N/A"
					}`,
					inline: false,
				});
			} else {
				fields.push({
					name: "Last Attestation Seen by Node",
					value: "None recorded",
					inline: false,
				});
			}

			if (result.lastProposalSlot !== undefined) {
				fields.push({
					name: "Last Proposal Seen by Node",
					value: `Slot: ${result.lastProposalSlot}\nTimestamp: ${
						result.lastProposalTimestamp
					}\nDate: ${
						result.lastProposalDate
							? new Date(result.lastProposalDate).toLocaleString()
							: "N/A"
					}`,
					inline: false,
				});
			} else {
				fields.push({
					name: "Last Proposal Seen by Node",
					value: "None recorded",
					inline: false,
				});
			}

			if (result.missedAttestationsCount !== undefined) {
				fields.push({
					name: "Missed Attestations",
					value: result.missedAttestationsCount.toString(),
					inline: true,
				});
			}
			if (result.missedProposalsCount !== undefined) {
				fields.push({
					name: "Missed Proposals",
					value: result.missedProposalsCount.toString(),
					inline: true,
				});
			}
			if (result.totalSlots !== undefined) {
				fields.push({
					name: "Total Slots Checked",
					value: result.totalSlots.toString(),
					inline: true,
				});
			}

			if (fields.length > 0) {
				embed.addFields(fields);
			}
		}

		await interaction.editReply({ embeds: [embed] });
		return embed.toJSON();
	} catch (error) {
		logger.error("Error executing RPC attestation check command:", error);

		throw error;
	}
}

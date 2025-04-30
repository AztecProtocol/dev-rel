import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { fetchValidatorStatsFromRpc } from "../../services/l2-info-service";

// Load environment variables
dotenv.config();

// Username to address mappings (can be replaced with an actual database or service lookup)
interface ValidatorRecord {
	username: string;
	address: string;
}

// Sample records - in a real implementation, this should come from a database or service
const validatorRecords: ValidatorRecord[] = [
	// Example records - should be replaced with actual data in production
	// { username: "validator1", address: "0x123..." },
];

/**
 * Checks if an operator is actively attesting (missed less than 20% of attestations)
 */
export async function isOperatorAttesting(
	interaction: ChatInputCommandInteraction
) {
	try {
		// Get address from options
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

		const address = addressOption.toLowerCase();

		// Fetch validator stats from RPC
		const validatorStats = await fetchValidatorStatsFromRpc(address);

		// Calculate percentage of missed attestations
		let isActive = false;
		let missedPercentage = 0;
		if (
			validatorStats.totalSlots &&
			validatorStats.missedAttestationsCount !== undefined
		) {
			missedPercentage =
				(validatorStats.missedAttestationsCount /
					validatorStats.totalSlots) *
				100;

			// Active if missed less than 20% of attestations
			isActive = missedPercentage < 20;
		}

		// Check if address matches our records
		const validatorRecord = validatorRecords.find(
			(record) => record.address.toLowerCase() === address
		);

		// Prepare response message
		let responseMessage = "";
		if (isActive) {
			responseMessage = `Yes, address ${addressOption} is actively attesting (miss percentage: ${missedPercentage.toFixed(
				2
			)}%).`;
		} else {
			responseMessage = `No, address ${addressOption} is not actively attesting (miss percentage: ${missedPercentage.toFixed(
				2
			)}%).`;
		}

		// Create a color-coded embed based on the result
		const embed = new EmbedBuilder()
			.setTitle(isActive ? "✅ ACTIVE OPERATOR" : "❌ INACTIVE OPERATOR")
			.setColor(isActive ? 0x00ff00 : 0xff0000) // Green for active, Red for inactive
			.setDescription(responseMessage);

		if (isActive) {
			embed.addFields([
				{
					name: "Username",
					value: validatorRecord
						? `\`${validatorRecord.username}\``
						: "Not known (not registered in discord)",
				},
			]);
		}

		await interaction.editReply({ embeds: [embed] });
		return responseMessage;
	} catch (error) {
		logger.error(
			"Error executing operator attestation check command:",
			error
		);
		await interaction.editReply(
			"Error checking operator attestation status."
		);
		throw error;
	}
}

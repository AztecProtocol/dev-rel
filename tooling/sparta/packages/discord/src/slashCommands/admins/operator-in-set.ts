import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { ChainInfoService } from "../../services/l1-info-service";

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
 * Checks if an address is in the validator set and if it matches our records
 */
export async function isOperatorInSet(
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

		// Check if address is in the validator set
		const chainInfoService = ChainInfoService.getInstance();
		await chainInfoService.init();
		const chainInfo = await chainInfoService.getInfo();

		const isInValidatorSet = chainInfo.validators.some(
			(validator: string) => validator.toLowerCase() === address
		);

		// Check if address matches our records
		const validatorRecord = validatorRecords.find(
			(record) => record.address.toLowerCase() === address
		);

		// Create a color-coded embed based on the result
		const embed = new EmbedBuilder()
			.setTitle(
				isInValidatorSet
					? "✅ YES - IN VALIDATOR SET"
					: "❌ NO - NOT IN VALIDATOR SET"
			)
			.setColor(isInValidatorSet ? 0x00ff00 : 0xff0000) // Green for YES, Red for NO
			.setDescription(`Address: \`${addressOption}\``)
			.addFields([
				{
					name: "Validator Status",
					value: isInValidatorSet
						? "This address is currently active in the validator set."
						: "This address is not found in the current validator set.",
				},
			]);

		// Add username information if in validator set
		if (isInValidatorSet) {
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
		return isInValidatorSet ? "YES" : "NO";
	} catch (error) {
		logger.error("Error executing validator check command:", error);
		await interaction.editReply("Error checking validator status.");
		throw error;
	}
}

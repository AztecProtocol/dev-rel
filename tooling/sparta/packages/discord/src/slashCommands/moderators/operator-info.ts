import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { clientPromise } from "../../api/axios";
import { l2InfoService } from "../../services/l2-info-service";
import { getEthereumInstance } from "@sparta/ethereum";

// Load environment variables
dotenv.config();

// Define types based on API responses
interface Validator {
	validatorAddress: string;
	nodeOperatorId: string;
}

interface NodeOperator {
	discordId: string;
	walletAddress: string;
	discordUsername?: string;
	isApproved?: boolean;
	createdAt: number;
	updatedAt: number;
	validators?: Validator[];
}

interface ValidatorDetail {
	address: string;
	inSet: boolean;
	attesting: boolean;
	missPercentage: string;
}

/**
 * Gets comprehensive information about a node operator by their Discord username
 * Combines the functionality of operator-attesting and operator-in-set
 */
export async function getOperatorInfo(
	interaction: ChatInputCommandInteraction
) {
	try {
		// Get Discord username from options
		const discordUsername = interaction.options.getString("username");

		if (!discordUsername) {
			await interaction.editReply("Please provide a Discord username.");
			return;
		}

		try {
			const client = await clientPromise;
			
			// Fetch operator info by Discord username
			try {
				// Call the operator API with the Discord username as query parameter
				const response = await client.getOperator({
					discordUsername: discordUsername
				});
				
				const operator = response.data as NodeOperator;
				
				if (!operator) {
					const embed = new EmbedBuilder()
						.setTitle("❌ OPERATOR NOT FOUND")
						.setColor(0xff0000) // Red for error
						.setDescription(`No node operator found with Discord username: \`${discordUsername}\``);
					
					await interaction.editReply({ embeds: [embed] });
					return;
				}
				
				// Get Ethereum instance for validator set check
				const ethereum = await getEthereumInstance();
				const chainInfo = await ethereum.getRollupInfo();
				
				// Initialize variables for reporting
				let hasValidators = false;
				let validatorsInSet = 0;
				let validatorsAttesting = 0;
				let totalValidators = 0;
				const validatorDetails: ValidatorDetail[] = [];
				
				// Process validator information if the operator has any
				if (operator.validators && operator.validators.length > 0) {
					hasValidators = true;
					totalValidators = operator.validators.length;
					
					// Process each validator
					for (const validator of operator.validators) {
						if (validator && validator.validatorAddress) {
							const validatorAddress = validator.validatorAddress;
							
							// Check if validator is in set
							const isInValidatorSet = chainInfo.validators.some(
								(v: string) => v.toLowerCase() === validatorAddress.toLowerCase()
							);
							
							// Check if validator is attesting (if in set)
							let isAttesting = false;
							let missPercentage = "N/A";
							
							if (isInValidatorSet) {
								validatorsInSet++;
								
								// Fetch attestation stats
								const validatorStats = await l2InfoService.fetchValidatorStats(validatorAddress);
								
								if (validatorStats.totalSlots && validatorStats.missedAttestationsCount !== undefined) {
									const missed = (validatorStats.missedAttestationsCount / validatorStats.totalSlots) * 100;
									missPercentage = missed.toFixed(2) + "%";
									
									// Active if missed less than 20% of attestations
									isAttesting = missed < 20;
									if (isAttesting) {
										validatorsAttesting++;
									}
								}
							}
							
							// Add to validator details
							validatorDetails.push({
								address: validatorAddress,
								inSet: isInValidatorSet,
								attesting: isAttesting,
								missPercentage: missPercentage
							});
						}
					}
				}
				
				// Create embed with all operator information
				const embed = new EmbedBuilder()
					.setTitle(`${operator.isApproved ? "✅" : "⚠️"} OPERATOR INFO: ${discordUsername}`)
					.setColor(operator.isApproved ? 0x00ff00 : 0xffcc00) // Green if approved, yellow if not
					.setDescription(`Comprehensive information about node operator: \`${discordUsername}\``)
					.addFields([
						{
							name: "Discord ID",
							value: `\`${operator.discordId}\``,
							inline: true
						},
						{
							name: "Wallet Address",
							value: `\`${operator.walletAddress}\``,
							inline: true
						},
						{
							name: "Approval Status",
							value: operator.isApproved ? "Approved ✅" : "Not Approved ⚠️",
							inline: true
						},
						{
							name: "Validators",
							value: hasValidators ? 
								`Total: ${totalValidators} | In Set: ${validatorsInSet} | Attesting: ${validatorsAttesting}` : 
								"No validators found",
						}
					]);
				
				// Add details for each validator if there are any
				if (hasValidators && validatorDetails.length > 0) {
					for (let i = 0; i < validatorDetails.length; i++) {
						const v = validatorDetails[i];
						if (v) {
							embed.addFields([
								{
									name: `Validator ${i+1}: ${v.address.substring(0, 10)}...`,
									value: `In Set: ${v.inSet ? "✅" : "❌"} | ` +
										   `Attesting: ${v.attesting ? "✅" : "❌"} | ` +
										   `Miss %: ${v.missPercentage}`,
									inline: false
								}
							]);
						}
					}
				}
				
				// Add registration timestamps
				embed.addFields([
					{
						name: "Registered",
						value: new Date(operator.createdAt).toISOString(),
						inline: true
					},
					{
						name: "Last Updated",
						value: new Date(operator.updatedAt).toISOString(),
						inline: true
					}
				]);
				
				await interaction.editReply({ embeds: [embed] });
				return;
				
			} catch (apiError: any) {
				logger.error("Error fetching operator:", apiError);
				
				if (apiError.response && apiError.response.status === 404) {
					const embed = new EmbedBuilder()
						.setTitle("❌ OPERATOR NOT FOUND")
						.setColor(0xff0000) // Red for error
						.setDescription(`No node operator found with Discord username: \`${discordUsername}\``);
					
					await interaction.editReply({ embeds: [embed] });
					return;
				}
				
				// Other errors
				const embed = new EmbedBuilder()
					.setTitle("❌ ERROR FETCHING OPERATOR INFO")
					.setColor(0xff0000) // Red for error
					.setDescription(`Error retrieving information for: \`${discordUsername}\``)
					.addFields([
						{
							name: "Error",
							value: "There was an error fetching operator information.",
						}
					]);

				await interaction.editReply({ embeds: [embed] });
				return;
			}
			
		} catch (error) {
			logger.error("Error with operator API service:", error);
			
			const embed = new EmbedBuilder()
				.setTitle("❌ SERVICE ERROR")
				.setColor(0xff0000) // Red for error
				.setDescription(`API service error when fetching info for: \`${discordUsername}\``)
				.addFields([
					{
						name: "Error",
						value: "The operator service is currently unavailable.",
					}
				]);

			await interaction.editReply({ embeds: [embed] });
			return;
		}
	} catch (error) {
		logger.error("Error executing operator info command:", error);
		await interaction.editReply("Error retrieving operator information.");
		throw error;
	}
} 
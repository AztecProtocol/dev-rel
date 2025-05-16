import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
} from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { clientPromise } from "@sparta/utils/openapi/api/axios";
import { getEthereumInstance, l2InfoService } from "@sparta/ethereum";

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
 * Handler for the operator "my-info" command
 * Shows the current user's operator information and validator status
 */
export async function getNodeOperatorInfo(
	interaction: ChatInputCommandInteraction
) {
	try {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral, // Make the response only visible to the user
		});

		// Get the user's Discord ID from the interaction
		const discordId = interaction.user.id;

		try {
			const client = await clientPromise;
			
			// Fetch operator info by Discord ID
			try {
				// Call the operator API with the Discord ID as query parameter
				const response = await client.getOperator({
					discordId: discordId
				});
				
				const operator = response.data as NodeOperator;
				
				if (!operator) {
					const embed = new EmbedBuilder()
						.setTitle("❌ NOT REGISTERED")
						.setColor(0xff0000) // Red for error
						.setDescription("You are not registered as a node operator.")
						.addFields([
							{
								name: "How to Register",
								value: "Use the `/operator start` command to register as a node operator.",
							}
						]);
					
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
					.setTitle(`YOUR OPERATOR INFO`)
					.setColor(0x4bb543) // Standard green color for operator info
					.setDescription(`Your node operator status and validator information`)
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
						.setTitle("❌ NOT REGISTERED")
						.setColor(0xff0000) // Red for error
						.setDescription("You are not registered as a node operator.")
						.addFields([
							{
								name: "How to Register",
								value: "Use the `/operator start` command to register as a node operator.",
							}
						]);
					
					await interaction.editReply({ embeds: [embed] });
					return;
				}
				
				// Other errors
				const embed = new EmbedBuilder()
					.setTitle("❌ ERROR FETCHING YOUR INFO")
					.setColor(0xff0000) // Red for error
					.setDescription("There was an error retrieving your operator information.")
					.addFields([
						{
							name: "Error",
							value: "The operator service returned an error.",
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
				.setDescription("API service error when fetching your operator information.")
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
		logger.error("Error executing my-info command:", error);
		await interaction.editReply("Error retrieving your operator information.");
		throw error;
	}
}

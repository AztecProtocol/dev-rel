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
						.setTitle("⚔️ WARRIOR NOT ENLISTED")
						.setColor(0xff0000) // Red for error
						.setDescription("You have not taken the Spartan oath yet, warrior.")
						.addFields([
							{
								name: "Join the Spartan Ranks",
								value: "Use the `/operator start` command to pledge your service to the Aztec Network.",
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
				
				// Fetch all validator stats at once for efficiency
				const allValidatorStats = await l2InfoService.fetchValidatorStatsWithCache(BigInt(chainInfo.currentEpoch)) as Record<string, any>;
				
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
								
								// Get attestation stats from pre-fetched data
								const validatorStats = allValidatorStats[validatorAddress.toLowerCase()];
								
								if (validatorStats && validatorStats.totalSlots && validatorStats.missedAttestationsCount !== undefined) {
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
					.setTitle(`🛡️ YOUR SPARTAN BATTLE REPORT`)
					.setColor(0x8B0000) // Deep red for Spartan theme
					.setDescription(`Your warrior status and battlefield performance in the Aztec Network`)
					.addFields([
						{
							name: "🎭 Warrior Identity (Discord ID)",
							value: `\`${operator.discordId}\``,
							inline: true
						},
						{
							name: "⚔️ Battle Address",
							value: `\`${operator.walletAddress}\``,
							inline: true
						},
						{
							name: "🏺 Validator Forces",
							value: hasValidators ? 
								`Total validators: **${totalValidators}** | In the Set: **${validatorsInSet}** | Attesting: **${validatorsAttesting}**` : 
								"No validators deployed for battle",
						}
					]);
				
				// Add details for each validator if there are any
				if (hasValidators && validatorDetails.length > 0) {
					for (let i = 0; i < validatorDetails.length; i++) {
						const v = validatorDetails[i];
						if (v) {
							embed.addFields([
								{
									name: `🗡️ Warrior ${i+1}: ${v.address.substring(0, 10)}...`,
									value: `In Formation: ${v.inSet ? "✅ **In Set**" : "❌ *Awaiting orders (Not in the Validator Set)**"} | ` +
										   `Battle Status: ${v.attesting ? "⚔️ **Attesting**" : "🛡️ *Faulty (Not Attesting)**"} | ` +
										   `Miss Rate: ${v.missPercentage}`,
									inline: false
								}
							]);
						}
					}
				}
				
				// Add registration timestamps
				embed.addFields([
					{
						name: "🏛️ Enlisted",
						value: new Date(operator.createdAt).toISOString(),
						inline: true
					},
					{
						name: "⚡ Last Battle Report",
						value: new Date(operator.updatedAt).toISOString(),
						inline: true
					}
				]);
				
				await interaction.editReply({ embeds: [embed] });
				return;
				
			} catch (apiError: any) {
				logger.error(apiError,"Error fetching operator");
				
				if (apiError.response && apiError.response.status === 404) {
					const embed = new EmbedBuilder()
						.setTitle("⚔️ WARRIOR NOT ENLISTED")
						.setColor(0xff0000) // Red for error
						.setDescription("You have not taken the Spartan oath yet, warrior.")
						.addFields([
							{
								name: "Join the Spartan Ranks",
								value: "Use the `/operator start` command to pledge your service to the Aztec Network.",
							}
						]);
					
					await interaction.editReply({ embeds: [embed] });
					return;
				}
				
				// Other errors
				const embed = new EmbedBuilder()
					.setTitle("⚔️ BATTLE INTELLIGENCE FAILURE")
					.setColor(0xff0000) // Red for error
					.setDescription("The Spartan scouts encountered an error while gathering your battle report.")
					.addFields([
						{
							name: "Error Status",
							value: "Our information networks are experiencing difficulties, warrior.",
						}
					]);

				await interaction.editReply({ embeds: [embed] });
				return;
			}
			
		} catch (error) {
			logger.error(error, "Error with operator API service");
			
			const embed = new EmbedBuilder()
				.setTitle("⚔️ SPARTAN COMMUNICATIONS DOWN")
				.setColor(0xff0000) // Red for error
				.setDescription("Our battle communication network is temporarily disrupted.")
				.addFields([
					{
						name: "Error Status",
						value: "The Spartan intelligence service is currently unreachable.",
					}
				]);

			await interaction.editReply({ embeds: [embed] });
			return;
		}
	} catch (error) {
		logger.error("Error executing my-info command:", error);
		await interaction.editReply("⚔️ Battle report failed! Our scribes encountered an error, warrior.");
		throw error;
	}
}

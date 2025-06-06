import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { clientPromise } from "@sparta/utils/openapi/api/axios";
import { getEthereumInstance } from "@sparta/ethereum";

// Load environment variables
dotenv.config();

// Define types based on API responses
interface NodeOperator {
	discordId: string;
	createdAt: number;
	updatedAt: number;
	validators?: string[];
}

interface ValidatorDetail {
	address: string;
	inSet: boolean;
	attesting: boolean;
	missPercentage: string;
	missedProposalsInfo: string;
	lastAttestationDate: string;
	lastProposalDate: string;
	peerId?: string;
	peerLocation?: string;
	peerStatus?: string;
	peerIp?: string;
	peerPort?: string;
	peerLastSeen?: string;
}

/**
 * Gets comprehensive information about a node operator by their Discord ID
 * Combines the functionality of operator-attesting and operator-in-set
 */
export async function getOperatorInfo(
	interaction: ChatInputCommandInteraction
) {
	try {
		// Get Discord user ID from options - username is no longer supported
		const discordUserId = interaction.options.getString("user-id");

		// Validate that user ID is provided
		if (!discordUserId) {
			await interaction.editReply("Please provide a Discord ID.");
			return;
		}

		try {
			const client = await clientPromise;
			
			// Fetch operator info by Discord ID
			try {
				// First, get the operator using the new by-socials route
				const response = await client.getOperatorBySocials({
					discordId: discordUserId
				});
				
				const operator = response.data as NodeOperator;
				
				if (!operator) {
					const embed = new EmbedBuilder()
						.setTitle("❌ OPERATOR NOT FOUND")
						.setColor(0xff0000) // Red for error
						.setDescription(`No node operator found with Discord ID: \`${discordUserId}\``);
					
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
					
					// Get detailed validator data for each validator
					for (const validatorAddress of operator.validators) {
						try {
							const validatorResponse = await client.getValidator({
								address: validatorAddress
							});
							
							// Extract the actual validator data from the nested response
							const validatorData = validatorResponse.data as any;
							const validator = validatorData.success ? validatorData.data : validatorData;
							
							// Check if validator is in set
							const isInValidatorSet = chainInfo.validators.some(
								(v: string) => v.toLowerCase() === validator.address.toLowerCase()
							);
							
							// Check if validator is attesting (if in set)
							let isAttesting = false;
							let missPercentage = "N/A";
							let missedProposalsInfo = "N/A";
							let lastAttestationDate = "N/A";
							let lastProposalDate = "N/A";
							let peerId = null;
							
							if (isInValidatorSet) {
								validatorsInSet++;
								
								// Check if validator has attested in last 24h
								if (validator.hasAttested24h) {
									isAttesting = true;
									validatorsAttesting++;
								}
								
								// Calculate miss percentage for attestations
								if (validator.totalSlots > 0) {
									const missRate = (validator.missedAttestationsCount / validator.totalSlots) * 100;
									missPercentage = `${missRate.toFixed(1)}%`;
								}
								
								// Calculate missed proposals info
								if (validator.missedProposalsCount !== undefined) {
									missedProposalsInfo = `${validator.missedProposalsCount} missed`;
								}
								
								// Format dates
								if (validator.lastAttestationDate) {
									lastAttestationDate = validator.lastAttestationDate;
								}
								if (validator.lastProposalDate) {
									lastProposalDate = validator.lastProposalDate;
								}
								
								// Get peer ID if available
								peerId = validator.peerId || null;
							}
							
							validatorDetails.push({
								address: validator.address,
								inSet: isInValidatorSet,
								attesting: isAttesting,
								missPercentage: missPercentage,
								missedProposalsInfo: missedProposalsInfo,
								lastAttestationDate: lastAttestationDate,
								lastProposalDate: lastProposalDate,
								peerId: peerId,
							});
							
						} catch (error) {
							logger.error(error, `Failed to fetch validator data for ${validatorAddress}`);
							// Add a basic entry for failed validator
							validatorDetails.push({
								address: validatorAddress,
								inSet: false,
								attesting: false,
								missPercentage: "Error loading data",
								missedProposalsInfo: "Error loading data",
								lastAttestationDate: "Error loading data",
								lastProposalDate: "Error loading data",
							});
						}
					}
				}
				
				// Check if any validators have associated peer IDs
				const hasAssociatedPeers = validatorDetails.some(v => v.peerId);
				
				// Create embed with all operator information
				const embed = new EmbedBuilder()
					.setTitle(`OPERATOR INFO: ${operator.discordId}`)
					.setColor(0x00ff00)
					.setDescription(`Comprehensive information about node operator: \`${operator.discordId}\``)
					.addFields([
						{
							name: "Discord ID",
							value: `\`${operator.discordId}\``,
							inline: true
						},
						{
							name: "Validators",
							value: hasValidators ? 
								`Total validators: **${totalValidators}** | In the Set: **${validatorsInSet}** | Attesting: **${validatorsAttesting}**` + 
								(hasAssociatedPeers ? ` | Recently seen: **${validatorDetails.filter(v => v.peerId).length}**` : "") : 
								"No validators deployed for battle",
						}
					]);

				// Add validator details if any exist
				if (hasValidators && validatorDetails.length > 0) {
					// Create detailed validator info (truncate if too many)
					const maxValidators = 10;
					const validatorsToShow = validatorDetails.slice(0, maxValidators);
					
					for (let i = 0; i < validatorsToShow.length; i++) {
						const val = validatorsToShow[i];
						if (val) {
							embed.addFields([
								{
									name: `Validator ${i + 1}: ${val.address.slice(0, 10)}...`,
									value: `In Set: ${val.inSet ? "✅" : "❌"} | Attesting: ${val.attesting ? "✅" : "❌"} | Miss Rate: ${val.missPercentage}` +
										   (val.peerId ? ` | Peer: ${val.peerId.slice(0, 10)}...` : ""),
									inline: false
								}
							]);
						}
					}
					
					if (validatorDetails.length > maxValidators) {
						embed.addFields([
							{
								name: "...",
								value: `And ${validatorDetails.length - maxValidators} more validators`,
								inline: false
							}
						]);
					}
				}

				await interaction.editReply({ embeds: [embed] });
				
			} catch (apiError: any) {
				logger.error(apiError, "Error fetching operator:");
				
				if (apiError.response && apiError.response.status === 404) {
					const embed = new EmbedBuilder()
						.setTitle("❌ OPERATOR NOT FOUND")
						.setColor(0xff0000) // Red for error
						.setDescription(`No node operator found with Discord ID: \`${discordUserId}\``);
					
					await interaction.editReply({ embeds: [embed] });
					return;
				}
				
				// Other errors
				const embed = new EmbedBuilder()
					.setTitle("❌ ERROR FETCHING OPERATOR INFO")
					.setColor(0xff0000) // Red for error
					.setDescription(`Error retrieving information for Discord ID: \`${discordUserId}\``)
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
			logger.error(error, "Error with operator API service");
			
			const embed = new EmbedBuilder()
				.setTitle("❌ SERVICE ERROR")
				.setColor(0xff0000) // Red for error
				.setDescription(`API service error when fetching info for Discord ID: \`${discordUserId}\``)
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
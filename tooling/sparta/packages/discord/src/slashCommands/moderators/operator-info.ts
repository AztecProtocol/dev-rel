import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { clientPromise } from "@sparta/utils/openapi/api/axios";
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
 * Gets comprehensive information about a node operator by their Discord username or ID
 * Combines the functionality of operator-attesting and operator-in-set
 */
export async function getOperatorInfo(
	interaction: ChatInputCommandInteraction
) {
	try {
		// Get Discord username and user ID from options
		let discordUsername = interaction.options.getString("username");
		const discordUserId = interaction.options.getString("user-id");

		// Validate that at least one parameter is provided
		if (!discordUsername && !discordUserId) {
			await interaction.editReply("Please provide either a Discord username or Discord ID.");
			return;
		}

		// If no username but user ID provided, try to fetch username from Discord
		if (!discordUsername && discordUserId) {
			try {
				const user = await interaction.guild?.members.fetch(discordUserId);
				if (!user) {
					await interaction.editReply("User not found with the provided Discord ID.");
					return;
				}
				discordUsername = user.user.username;
			} catch (fetchError) {
				await interaction.editReply("Unable to fetch user information from the provided Discord ID.");
				return;
			}
		}

		// At this point, discordUsername should be defined
		if (!discordUsername) {
			await interaction.editReply("Unable to determine Discord username.");
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
					
					// Get detailed validator data for each validator
					for (const validatorRef of operator.validators) {
						try {
							const validatorResponse = await client.getValidator({
								address: validatorRef.validatorAddress
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
							
							if (isInValidatorSet) {
								validatorsInSet++;
								
								// Get attestation stats from API response
								if (validator.totalSlots && validator.missedAttestationsCount !== undefined) {
									const missedAttestations = validator.missedAttestationsCount;
									const totalSlots = validator.totalSlots;
									const missed = (missedAttestations / totalSlots) * 100;
									missPercentage = `${missed.toFixed(2)}% (${missedAttestations}/${totalSlots})`;
									
									// Active if missed less than 20% of attestations
									isAttesting = missed < 20;
									if (isAttesting) {
										validatorsAttesting++;
									}
								}
								
								// Handle proposal stats
								if (validator.missedProposalsCount !== undefined && validator.totalSlots) {
									const missedProposals = validator.missedProposalsCount;
									const totalSlots = validator.totalSlots;
									const missedProposalPercent = (missedProposals / totalSlots) * 100;
									missedProposalsInfo = `${missedProposalPercent.toFixed(2)}% (${missedProposals}/${totalSlots})`;
								}
							}
							
							// Extract peer information from API response
							let peerLocation = "Unknown";
							let peerStatus = "Unknown";
							let peerIp = validator.peerIpAddress || "Unknown";
							let peerPort = validator.peerPort?.toString() || "Unknown";
							let peerLastSeen = validator.peerLastSeen || "Unknown";
							
							if (validator.peerId) {
								// Build location from API data
								if (validator.peerCity && validator.peerCountry) {
									peerLocation = `${validator.peerCity}, ${validator.peerCountry}`;
								}
								
								// Determine peer status from API data
								if (validator.peerIsSynced === true) {
									peerStatus = "🟢 Synced";
								} else if (validator.peerIsSynced === false) {
									peerStatus = "🔴 Not synced";
								} else if (validator.peerLastSeen) {
									// Check if recently seen (within 24 hours)
									const lastSeen = new Date(validator.peerLastSeen);
									const now = new Date();
									const hoursSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
									
									if (hoursSinceLastSeen < 24) {
										peerStatus = "🟢 Recently seen";
									} else {
										peerStatus = "🔴 Offline";
									}
								}
								
								if (validator.peerLastSeen) {
									peerLastSeen = new Date(validator.peerLastSeen).toISOString();
								}
							}
							
							// Add to validator details
							validatorDetails.push({
								address: validator.address,
								inSet: isInValidatorSet,
								attesting: isAttesting,
								missPercentage: missPercentage,
								missedProposalsInfo: missedProposalsInfo,
								lastAttestationDate: validator.lastAttestationDate || "Never",
								lastProposalDate: validator.lastProposalDate || "Never",
								peerId: validator.peerId,
								peerLocation: peerLocation,
								peerStatus: peerStatus,
								peerIp: peerIp,
								peerPort: peerPort,
								peerLastSeen: peerLastSeen,
							});
						} catch (error) {
							logger.error(error, `Failed to fetch validator data for ${validatorRef.validatorAddress}`);
							// Add a basic entry for failed validator
							validatorDetails.push({
								address: validatorRef.validatorAddress,
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
								`Total validators: **${totalValidators}** | In the Set: **${validatorsInSet}** | Attesting: **${validatorsAttesting}**` + 
								(hasAssociatedPeers ? ` | Recently seen: **${validatorDetails.filter(v => v.peerId).length}**` : "") : 
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
									name: `Validator ${i+1}: ${v.address.substring(0, 10)}...`,
									value: `**In Formation:** ${v.inSet ? "✅ In Set" : "❌ Awaiting orders"}\n` +
										   `**Battle Status:** ${v.attesting ? "🟢 Attesting" : "🔴 Faulty"}\n` +
										   `**Missed Attestations:** ${v.missPercentage}\n` +
										   `**Missed Proposals:** ${v.missedProposalsInfo}\n` +
										   `**Last Attestation:** ${v.lastAttestationDate}\n` +
										   `**Last Proposal:** ${v.lastProposalDate}` +
										   (v.peerId ? `\n**Network Status:** ${v.peerStatus}\n**Location:** ${v.peerLocation}\n**IP Address:** ${v.peerIp}\n**Port:** ${v.peerPort}\n**Last Seen:** ${v.peerLastSeen}` : ""),
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
				logger.error(apiError, "Error fetching operator:");
				
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
			logger.error(error, "Error with operator API service");
			
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
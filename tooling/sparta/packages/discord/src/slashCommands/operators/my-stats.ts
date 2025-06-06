import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} from "discord.js";
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
				// Use the new by-socials route to find operator by Discord ID
				const response = await client.getOperatorBySocials({
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
					.setTitle(`🛡️ YOUR SPARTAN BATTLE REPORT`)
					.setColor(0x00ff00) // Deep red for Spartan theme
					.setDescription(`Your warrior status and battlefield performance in the Aztec Network`)
					.addFields([
						{
							name: "🎭 Warrior Identity (Discord ID)",
							value: `\`${operator.discordId}\``,
							inline: true
						},
						{
							name: "🏺 Validator Forces",
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
									name: `🗡️ Warrior ${i+1}: ${v.address.substring(0, 10)}...`,
									value: `**In Formation:** ${v.inSet ? "✅ In Set" : "❌ Awaiting orders"}\n` +
										   `**Battle Status:** ${v.attesting ? "🟢 Attesting" : "🔴 Faulty"}\n` +
										   `**Missed Attestations:** ${v.missPercentage}\n` +
										   `**Missed Proposals:** ${v.missedProposalsInfo}\n` +
										   `**Last Attestation:** ${v.lastAttestationDate}\n` +
										   `**Last Proposal:** ${v.lastProposalDate}` +
										   (v.peerId ? `\n**Network Status:** ${v.peerStatus}\n**Battle Station:** ${v.peerLocation}\n**War Machine IP:** ${v.peerIp}\n**Port:** ${v.peerPort}\n**Last Signal:** ${v.peerLastSeen}` : ""),
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
					}
				]);
				
				// Create action rows with buttons for all validators
				const actionRows: ActionRowBuilder<ButtonBuilder>[] = [];
				
				if (validatorDetails.length > 0) {
					// Create buttons for each validator (max 5 per row, max 5 rows)
					for (let i = 0; i < Math.min(validatorDetails.length, 25); i += 5) {
						const row = new ActionRowBuilder<ButtonBuilder>();
						const endIndex = Math.min(i + 5, validatorDetails.length);
						
						for (let j = i; j < endIndex; j++) {
							const validator = validatorDetails[j];
							if (validator) {
								const validatorIndex = j + 1;
								const hasData = !!validator.peerId;
								
								const button = new ButtonBuilder()
									.setCustomId(`add_peer_${validator.address}`)
									.setLabel(hasData ? `🔄 Update Validator (Warrior ${validatorIndex})` : `🌐 Connect Validator (Warrior ${validatorIndex})`)
									.setStyle(hasData ? ButtonStyle.Primary : ButtonStyle.Secondary)
									.setEmoji(hasData ? '🔄' : '🔗');
								
								row.addComponents(button);
							}
						}
						actionRows.push(row);
					}
				}
				
				// Send the embed with buttons (if any)
				const replyOptions: any = { embeds: [embed] };
				if (actionRows.length > 0) {
					replyOptions.components = actionRows;
				}
				
				await interaction.editReply(replyOptions);
				
				// Set up collector for button interactions
				if (actionRows.length > 0) {
					const collector = interaction.channel?.createMessageComponentCollector({
						componentType: ComponentType.Button,
						time: 300000, // 5 minutes
						filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('add_peer_')
					});
					
					collector?.on('collect', async (buttonInteraction) => {
						// Button interactions are now handled by the main Discord client
						logger.debug(`Button collector received interaction: ${buttonInteraction.customId}`);
					});
					
					collector?.on('end', async () => {
						// Remove buttons after timeout
						try {
							await interaction.editReply({ 
								embeds: [embed],
								components: [] 
							});
						} catch (error) {
							// Ignore errors if message was already deleted/modified
						}
					});
				}
				
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

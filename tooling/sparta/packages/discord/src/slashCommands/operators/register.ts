import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
} from "discord.js";
import { logger } from "@sparta/utils";
import { l2InfoService } from "@sparta/ethereum";
import { clientPromise } from "@sparta/utils/openapi/api/axios";
import { NODE_OPERATOR_ROLES } from "@sparta/utils/const/roles";
import { _handleNodeOperatorRoleAssignment } from "../../utils/roleAssigner";

/**
 * Handle the "register" subcommand to verify a validator's sync proof
 */
export async function registerValidator(
	interaction: ChatInputCommandInteraction
): Promise<string> {
	await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});

	try {
		// Get parameters from the command options
		const address = interaction.options.getString("address");
		const blockNumber = interaction.options.getString("block-number");
		const proof = interaction.options.getString("proof");

		// Validate address format
		if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
			await interaction.editReply("⚔️ Invalid battle address format, warrior! Ensure it follows Ethereum standards.");
			return "Invalid address format";
		}

		if (!blockNumber || !/^[0-9]+$/.test(blockNumber)) {
			await interaction.editReply("🏛️ Invalid stronghold number format, warrior!");
			return "Invalid block number format";
		}

		if (!proof) {
			await interaction.editReply("📜 Invalid proof format, warrior! Your sync proof appears corrupted.");
			return "Invalid proof format";
		}

		try {
			// Verify the proof using the L2InfoService
			const isValid = await l2InfoService.proveSynced(blockNumber, proof);

			// Create a Discord embed for the result
			const embed = new EmbedBuilder()
				.setTitle(`⚔️ SPARTAN WARRIOR REGISTRATION`)
				.setColor(isValid ? 0x8B0000 : 0xff0000) // Deep red for success, bright red for failure
				.setTimestamp()
				.setFooter({ text: "Aztec Network • Spartan Defense Force" });

			const displayAddress = `${address.slice(0, 6)}...${address.slice(
				-4
			)}`; // Shortened address

			if (isValid) {
				// Get Discord user ID from interaction
				const discordId = interaction.user.id;

				try {
					// Get API client
					const client = await clientPromise;

					let operationResult = "created"; // Default to "created" status

					try {
						// Step 1: Check if operator exists with this discordId
						const { data: operatorData } =
							await client.getOperator(
								{
									discordId,
								},
							);

						if (
							operatorData &&
							operatorData.walletAddress !== address
						) {
							// Update wallet if it's a different address
							await client.updateOperator(
								{
									discordId: operatorData.discordId,
									walletAddress: address,
									discordUsername: interaction.user.username,
								},
								{}
							);
							operationResult = "updated";
						} else {
							operationResult = "unchanged";
						}
					} catch (error: any) {
						logger.error(error, "Error creating or updating operator");

						// If 404, create new operator
						if (error.response && error.response.status === 404) {
							await client.createOperator(
								{
									discordId,
									walletAddress: address,
									discordUsername: interaction.user.username,
								},
								{}
							);
							operationResult = "created";
						} else {
							// Rethrow for outer catch block
							throw error;
						}
					}

					// Add Apprentice role to the user using the Discord service
					// This grants the user access to resources reserved for validated node operators
					if (
						operationResult === "created" ||
						operationResult === "updated"
					) {
						try {
							const success =
								await _handleNodeOperatorRoleAssignment(
									discordId,
									NODE_OPERATOR_ROLES.APPRENTICE!
								);
							if (success) {
								logger.info(
									`Added Apprentice role to user ${discordId}`
								);
							} else {
								logger.error(
									`Failed to assign Apprentice role to user ${discordId}`
								);
							}
						} catch (roleError) {
							logger.error(
								"Error adding Apprentice role:",
								roleError
							);
						}
					}

					// Set appropriate message based on operation result
					if (operationResult === "created") {
						embed.setDescription(
							`🛡️ **Welcome to the Spartan ranks, warrior ${displayAddress}!**\n⚔️ Your oath has been accepted and your battle station prepared.`
						);
						embed.addFields(
							{
								name: "🏺 Battle Address",
								value: address,
								inline: false,
							},
							{
								name: "🏛️ Stronghold Number",
								value: blockNumber,
								inline: true,
							},
							{
								name: "📜 Proof Status",
								value: "✅ **Verified by the Oracle**",
								inline: true,
							},
							{
								name: "⚡ Rank Achieved",
								value: "🥉 **Spartan Apprentice** - Welcome to the brotherhood!",
								inline: false,
							}
						);
					} else if (operationResult === "updated") {
						embed.setDescription(
							`🔄 **Battle address updated for warrior ${displayAddress}!**\n⚔️ Your new coordinates have been recorded in our war registry.`
						);
						embed.addFields(
							{
								name: "🏺 New Battle Address",
								value: address,
								inline: false,
							},
							{
								name: "🏛️ Stronghold Number",
								value: blockNumber,
								inline: true,
							},
							{
								name: "📜 Proof Status",
								value: "✅ **Verified by the Oracle**",
								inline: true,
							},
							{
								name: "⚡ Status Update",
								value: "🔧 **Coordinates Updated** - Ready for battle!",
								inline: false,
							}
						);
					} else {
						embed.setDescription(
							`✅ **Proof verified for warrior ${displayAddress}!**\n🛡️ Your commitment to the Spartan cause is confirmed.`
						);
						embed.addFields(
							{
								name: "🏺 Battle Address",
								value: address,
								inline: false,
							},
							{
								name: "🏛️ Stronghold Number",
								value: blockNumber,
								inline: true,
							},
							{
								name: "📜 Proof Status",
								value: "✅ **Verified by the Oracle**",
								inline: true,
							},
							{
								name: "⚡ Current Status",
								value: "🏛️ **Already Enlisted** - Standing strong with us!",
								inline: false,
							}
						);
					}
				} catch (apiError) {
					console.log(apiError);
					logger.error(apiError, "Error with operator API");

					// Set fallback message when API error occurs
					embed.setDescription(
						`⚔️ **Warrior ${displayAddress} proof accepted, but our scribes are unavailable (API Error)!**\n🏺 Your battle worthiness is proven, but registration records are temporarily inaccessible.`
					);
					embed.addFields(
						{
							name: "🏺 Battle Address",
							value: address,
							inline: false,
						},
						{
							name: "🏛️ Stronghold Number",
							value: blockNumber,
							inline: true,
						},
						{
							name: "📜 Proof Status",
							value: "✅ **Verified by the Oracle**",
							inline: true,
						},
						{
							name: "⚠️ Spartan Notice",
							value: "🏛️ Registry service disrupted - retry your oath later, warrior",
							inline: false,
						}
					);
				}
			} else {
				embed.setDescription(`❌ **Warrior registration denied!**\n⚔️ Your proof of battle readiness has been rejected by the Oracle.`);
				embed.addFields(
					{ 
						name: "🏺 Battle Address", 
						value: address, 
						inline: false 
					},
					{ 
						name: "🚫 Rejection Reason", 
						value: "📜 **Invalid sync proof** - Your node may not be battle-ready", 
						inline: false 
					}
				);
			}

			await interaction.editReply({ embeds: [embed] });

			return isValid ? "Spartan registration successful" : "Registration denied by Oracle";
		} catch (error) {
			logger.error("Error validating proof:", error);

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			const embed = new EmbedBuilder()
				.setTitle(`⚔️ SPARTAN REGISTRATION ERROR`)
				.setColor(0xff0000) // Red for error
				.setDescription(
					`❌ **Battle registration failed, warrior:**\n🏺 ${errorMessage}`
				)
				.setTimestamp()
				.setFooter({ text: "Aztec Network • Spartan Defense Force" });

			await interaction.editReply({ embeds: [embed] });
			return `Registration error: ${errorMessage}`;
		}
	} catch (error) {
		logger.error("Error executing validator registration command:", error);

		if (interaction.replied || interaction.deferred) {
			await interaction.editReply({
				content:
					"⚔️ The Spartan registration ritual has failed! Our battle systems encountered an error, warrior.",
			});
		} else {
			await interaction.editReply({
				content:
					"⚔️ The Spartan registration ritual has failed! Our battle systems encountered an error, warrior.",
			});
		}

		throw error;
	}
}

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
			await interaction.editReply("Invalid Ethereum address format.");
			return "Invalid address format";
		}

		if (!blockNumber || !/^[0-9]+$/.test(blockNumber)) {
			await interaction.editReply("Invalid block number format.");
			return "Invalid block number format";
		}

		if (!proof) {
			await interaction.editReply("Invalid proof format.");
			return "Invalid proof format";
		}

		try {
			// Verify the proof using the L2InfoService
			const isValid = await l2InfoService.proveSynced(blockNumber, proof);

			// Create a Discord embed for the result
			const embed = new EmbedBuilder()
				.setTitle(`Validator Registration`)
				.setColor(isValid ? 0x00ff00 : 0xff0000) // Green for success, Red for failure
				.setTimestamp()
				.setFooter({ text: "Sparta Validator Registration" });

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
							`✅ **New validator ${displayAddress} registered successfully!**`
						);
						embed.addFields(
							{
								name: "Address",
								value: address,
								inline: false,
							},
							{
								name: "Block Number",
								value: blockNumber,
								inline: true,
							},
							{
								name: "Proof Verified",
								value: "✓",
								inline: true,
							},
							{
								name: "Status",
								value: "New operator registered",
								inline: false,
							}
						);
					} else if (operationResult === "updated") {
						embed.setDescription(
							`✅ **Validator ${displayAddress} updated successfully!**`
						);
						embed.addFields(
							{
								name: "Address",
								value: address,
								inline: false,
							},
							{
								name: "Block Number",
								value: blockNumber,
								inline: true,
							},
							{
								name: "Proof Verified",
								value: "✓",
								inline: true,
							},
							{
								name: "Status",
								value: "Wallet address updated",
								inline: false,
							}
						);
					} else {
						embed.setDescription(
							`✅ **Validator ${displayAddress} verification successful!**`
						);
						embed.addFields(
							{
								name: "Address",
								value: address,
								inline: false,
							},
							{
								name: "Block Number",
								value: blockNumber,
								inline: true,
							},
							{
								name: "Proof Verified",
								value: "✓",
								inline: true,
							},
							{
								name: "Status",
								value: "Already registered with this address",
								inline: false,
							}
						);
					}
				} catch (apiError) {
					console.log(apiError);
					logger.error(apiError, "Error with operator API");

					// Set fallback message when API error occurs
					embed.setDescription(
						`✅ **Validator ${displayAddress} proof verified, but registration service unavailable.**`
					);
					embed.addFields(
						{
							name: "Address",
							value: address,
							inline: false,
						},
						{
							name: "Block Number",
							value: blockNumber,
							inline: true,
						},
						{
							name: "Proof Verified",
							value: "✓",
							inline: true,
						},
						{
							name: "Note",
							value: "Registration service error - please try again later",
							inline: false,
						}
					);
				}
			} else {
				embed.setDescription(`❌ **Validator registration failed.**`);
				embed.addFields(
					{ name: "Address", value: address, inline: false },
					{ name: "Reason", value: "Invalid proof", inline: false }
				);
			}

			await interaction.editReply({ embeds: [embed] });

			return isValid ? "Registration successful" : "Registration failed";
		} catch (error) {
			logger.error("Error validating proof:", error);

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			const embed = new EmbedBuilder()
				.setTitle(`Registration Error`)
				.setColor(0xff0000) // Red for error
				.setDescription(
					`❌ **Validator registration failed:**\n${errorMessage}`
				)
				.setTimestamp()
				.setFooter({ text: "Sparta Validator Registration" });

			await interaction.editReply({ embeds: [embed] });
			return `Registration error: ${errorMessage}`;
		}
	} catch (error) {
		logger.error("Error executing validator registration command:", error);

		if (interaction.replied || interaction.deferred) {
			await interaction.editReply({
				content:
					"Something went wrong while processing your registration.",
			});
		} else {
			await interaction.editReply({
				content:
					"Something went wrong while processing your registration.",
			});
		}

		throw error;
	}
}

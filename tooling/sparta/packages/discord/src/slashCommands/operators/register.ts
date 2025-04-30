import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import { l2InfoService } from "../../services/l2-info-service";
import { clientPromise } from "../../api/axios";
import { USER_ROLES } from "../../utils/roles";
import { _handleNodeOperatorRoleAssignment } from "../../utils/roleAssigner";

/**
 * Display detailed instructions for validator registration
 */
export async function showRegistrationHelp(
	interaction: ChatInputCommandInteraction
): Promise<string> {
	try {
		// Create a registration instructions embed
		const registrationEmbed = new EmbedBuilder()
			.setTitle("📝 How to Get the Apprentice Role")
			.setDescription(
				"Follow these steps to generate a sync proof and register your validator node on the discord server"
			)
			.setColor(0x4bb543) // Green color
			.addFields([
				{
					name: "📋 Step 1: Get the latest proven block number",
					value: '```bash\ncurl -s -X POST -H \'Content-Type: application/json\' \\\n-d \'{"jsonrpc":"2.0","method":"node_getL2Tips","params":[],"id":67}\' \\\n<your-node-url> | jq ".result.proven.number"\n```\n• Save this block number for the next steps\n• Example output: `12345`',
					inline: false,
				},
				{
					name: "🔍 Step 2: Generate your sync proof",
					value: '```bash\ncurl -s -X POST -H \'Content-Type: application/json\' \\\n-d \'{"jsonrpc":"2.0","method":"node_getArchiveSiblingPath","params":["<block-number>","<block-number>"],"id":67}\' \\\n<your-node-url> | jq ".result"\n```\n• Replace `<block-number>` with the number from Step 1\n• This will output a long base64-encoded string - save it for registration',
					inline: false,
				},
				{
					name: "✅ Step 3: Register with Discord",
					value: "Run the following command in this Discord server:\n```\n/operator register <node-address> <block-number> <proof>\n```\n• `<node-address>`: Your Ethereum validator address\n• `<block-number>`: The block number from Step 1\n• `<proof>`: The base64 string from Step 2",
					inline: false,
				},
				{
					name: "💡 Tips for Success",
					value: "• Ensure your node is fully synced before attempting registration\n• Double-check your validator address format (must begin with 0x)\n• Make sure to copy the entire proof string without missing any characters\n• If registration fails, try generating a new proof with a more recent block",
					inline: false,
				},
			]);

		await interaction.editReply({
			embeds: [registrationEmbed],
		});

		return "Registration instructions displayed successfully";
	} catch (error) {
		logger.error("Error displaying registration help:", error);
		await interaction.editReply({
			content: "Error displaying registration instructions.",
		});
		throw error;
	}
}

/**
 * Handle the "register" subcommand to verify a validator's sync proof
 */
export async function registerValidator(
	interaction: ChatInputCommandInteraction
): Promise<string> {
	try {
		await interaction.deferReply();

		// Get parameters from the command options
		const address = interaction.options.getString("address");
		const blockNumber = interaction.options.getString("block-number");
		const proof = interaction.options.getString("proof");

		// If called without parameters, show registration help
		if (!address || !blockNumber || !proof) {
			return showRegistrationHelp(interaction);
		}

		// Validate address format
		if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
			await interaction.editReply("Invalid Ethereum address format.");
			return "Invalid address format";
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
							await client.getOperatorByDiscordId({
								discordId,
							});

						if (
							operatorData &&
							operatorData.walletAddress !== address
						) {
							// Update wallet if it's a different address
							await client.updateOperatorWallet(
								{
									discordId: operatorData.discordId,
								},
								{
									walletAddress: address,
								}
							);
							operationResult = "updated";
						} else {
							operationResult = "unchanged";
						}
					} catch (error: any) {
						// If 404, create new operator
						if (error.response && error.response.status === 404) {
							await client.createOperator(null, {
								discordId,
								walletAddress: address,
							});
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
									USER_ROLES.APPRENTICE.name
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
					// console.log(apiError);
					logger.error("Error with operator API:", { apiError });

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
			await interaction.reply({
				content:
					"Something went wrong while processing your registration.",
				ephemeral: true,
			});
		}

		throw error;
	}
}

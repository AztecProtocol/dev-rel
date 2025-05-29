/**
 * @fileoverview Discord client and utilities
 * @description Provides Discord client configuration and event handling
 * @module sparta/discord/clients
 */

import {
	Client,
	GatewayIntentBits,
	Collection,
	type Interaction,
	MessageFlags,
	TextChannel,
	REST,
	Routes,
	ButtonInteraction,
	ModalSubmitInteraction,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
} from "discord.js";
import { logger, queryValidatorNode } from "@sparta/utils";
import { ApiProvider } from "@sparta/utils/openapi/api/apiProvider";
import commands from "../slashCommands/index";
import { getNodeOperatorInfo } from "../slashCommands/operators/my-stats.js";
import { get as getChainInfo } from "../slashCommands/aztec/info.js";
import { showRegistrationHelp } from "../slashCommands/operators/help.js";

// Command interface
interface Command {
	data: {
		toJSON: () => any;
		name: string;
	};
	execute: (interaction: Interaction) => Promise<any>;
}

// Extended Discord client interface with commands collection
export interface ExtendedClient extends Client {
	commands: Collection<string, Command>;
}

export class Discord {
	private client: ExtendedClient;
	private apiProvider: ApiProvider;

	constructor(client: ExtendedClient, apiProvider: ApiProvider) {
		this.client = client;
		this.apiProvider = apiProvider;
	}

	/**
	 * Creates a new Discord instance with initialized client
	 */
	static new = async () => {
		try {
			logger.info("Initializing Discord client");

			// Initialize Discord client with required intents
			const client = new Client({
				intents: [
					GatewayIntentBits.Guilds,
					GatewayIntentBits.GuildMessages,
				],
			}) as ExtendedClient;

			// Initialize commands collection
			client.commands = new Collection();

			// Initialize API provider
			const apiProvider = ApiProvider.getInstance();
			await apiProvider.init();

			if (!apiProvider.isInitialized()) {
				const error = apiProvider.getError();
				logger.error({ error }, "Failed to initialize API provider");
				throw error || new Error("Failed to initialize API provider");
			}

			// Set up event handlers
			Discord.setupEventHandlers(client);

			// Log in to Discord
			await client.login(process.env.BOT_TOKEN);

			return new Discord(client, apiProvider);
		} catch (error) {
			logger.error({ error }, "Error initializing Discord client");
			throw error;
		}
	};

	/**
	 * Sets up the event handlers for the Discord client
	 * @param client The Discord client
	 */
	private static setupEventHandlers(client: ExtendedClient): void {
		/**
		 * Error event handler
		 */
		client.once("error", (error) => {
			logger.error({ error }, "Discord client error");
		});

		/**
		 * Ready event handler - called when bot is initialized
		 */
		client.once("ready", async () => {
			logger.info("Sparta bot is ready!");
			logger.info(
				{ clientId: process.env.BOT_CLIENT_ID },
				"Bot connected with Client ID"
			);
			Discord.deployCommands(client);
		});

		/**
		 * Interaction event handler - processes all slash commands
		 * @param {Interaction} interaction - The interaction object from Discord
		 */
		client.on("interactionCreate", async (interaction: Interaction) => {
			// Handle slash commands
			if (interaction.isChatInputCommand()) {
				const command = client.commands.get(interaction.commandName);
				if (!command) return;

				logger.debug(
					{
						command: interaction.commandName,
						subcommand: interaction.options.getSubcommand(),
					},
					"Command"
				);
				try {
					const channel = interaction.channel as TextChannel;

					logger.debug(
						{
							channel: channel.name,
							user: interaction.user.username,
							date: interaction.createdAt,
						},
						"Command info"
					);
					const reply = await command.execute(interaction);
					logger.debug(
						{
							reply,
						},
						"Command reply"
					);
				} catch (error) {
					logger.error({ error }, "Error executing command");
					await interaction.reply({
						content: "There was an error executing this command!",
						flags: MessageFlags.Ephemeral,
					});
				}
			}
			
			// Handle button interactions
			if (interaction.isButton()) {
				try {
					await Discord.handleButtonInteraction(interaction as ButtonInteraction);
				} catch (error) {
					logger.error({ error }, "Error handling button interaction");
					if (!interaction.replied && !interaction.deferred) {
						await interaction.reply({
							content: "There was an error processing your request!",
							flags: MessageFlags.Ephemeral,
						});
					}
				}
			}
			
			// Handle modal submissions
			if (interaction.isModalSubmit()) {
				try {
					await Discord.handleModalSubmission(interaction);
				} catch (error) {
					logger.error({ error }, "Error handling modal submission");
					if (!interaction.replied && !interaction.deferred) {
						await interaction.reply({
							content: "There was an error processing your modal submission!",
							flags: MessageFlags.Ephemeral,
						});
					}
				}
			}
		});
	}

	/**
	 * Deploys all slash commands to the Discord server
	 * @param client The Discord client
	 */
	private static async deployCommands(client: ExtendedClient): Promise<void> {
		const rest = new REST({ version: "10" }).setToken(
			process.env.BOT_TOKEN as string
		);

		try {
			logger.info(
				{
					clientId: process.env.BOT_CLIENT_ID,
					guildId: process.env.GUILD_ID,
				},
				"Started refreshing application (/) commands"
			);

			// Import all commands
			const commandsObj = {
				...commands,
			};

			const commandsData = Object.values(commandsObj)
				.filter((cmd) => cmd && typeof cmd.data?.toJSON === "function")
				.map((command) => command.data.toJSON());

			try {
				const response = await rest.put(
					Routes.applicationGuildCommands(
						process.env.BOT_CLIENT_ID as string,
						process.env.GUILD_ID as string
					),
					{
						body: commandsData,
					}
				);

				logger.debug(
					{
						commandCount: commandsData.length,
						responseStatus: response ? "success" : "unknown",
					},
					"Command registration response"
				);

				// Register commands in client
				for (const [_, command] of Object.entries(commandsObj)) {
					if (command && command.data && command.data.name) {
						client.commands.set(
							command.data.name,
							command as Command
						);
						logger.debug(
							`Registered command: ${command.data.name}`
						);
					}
				}

				logger.info("Successfully reloaded application (/) commands");
			} catch (putError: any) {
				// More detailed error logging for the REST call
				logger.error(
					{
						error: putError,
						code: putError.code,
						status: putError.status,
						message: putError.message,
						clientId: process.env.BOT_CLIENT_ID,
						guildId: process.env.GUILD_ID,
						tokenPresent: !!process.env.BOT_TOKEN,
						tokenLength: process.env.BOT_TOKEN?.length,
					},
					"Error during Discord REST API call to register commands"
				);

				// Check for common issues
				if (putError.status === 403) {
					logger.error(
						"Permission denied (403) - The bot token may be invalid or the bot doesn't have the required permissions"
					);
				}
				if (putError.code === 50001) {
					logger.error(
						"Missing Access - Bot doesn't have required permissions in this guild"
					);
				}
				if (putError.code === 50035) {
					logger.error(
						"Invalid Form Body - Command structure might be invalid"
					);
				}
			}
		} catch (error: any) {
			logger.error(
				{
					error: error.message,
					stack: error.stack,
				},
				"Error deploying commands"
			);
		}
	}

	/**
	 * Gets the Discord client
	 */
	getClient = () => {
		return this.client;
	};

	/**
	 * Gets the API provider
	 */
	getApiProvider = () => {
		return this.apiProvider;
	};

	/**
	 * Finds a guild by ID
	 */
	getGuild = async (guildId: string) => {
		return await this.client.guilds.fetch(guildId);
	};

	/**
	 * Handle button interactions from Discord
	 * @param interaction The button interaction
	 */
	private static async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
		const { customId, user } = interaction;
		
		logger.debug(`Button interaction: ${customId} by ${user.username}`);

		// Handle dynamic peer buttons
		if (customId.startsWith('add_peer_')) {
			const validatorAddress = customId.replace('add_peer_', '');
			await Discord.handlePeerInfoModal(interaction, validatorAddress);
			return;
		}

		// Route button interactions based on customId
		switch (customId) {
			case 'operator_my_stats':
				await getNodeOperatorInfo(interaction as any);
				break;
				
			case 'operator_chain_info':
				await getChainInfo(interaction as any);
				break;
				
			case 'operator_registration_guide':
				await showRegistrationHelp(interaction as any);
				break;
				
			case 'operator_start_registration':
				await interaction.reply({
					content: "To register your validator, please use the `/operator start` command with the following parameters:\n\n• `address` - Your validator address (starting with 0x)\n• `block-number` - Block number from your node\n• `proof` - Your sync proof\n\nFor detailed instructions, click the **Registration Guide** button.",
					flags: MessageFlags.Ephemeral,
				});
				break;
				
			case 'operator_add_validator':
				await interaction.reply({
					content: "To add a new validator to your account, please use the `/operator add-validator` command with your validator address.\n\n**Note:** You must have the Guardian role to use this command.",
					flags: MessageFlags.Ephemeral,
				});
				break;
				
			case 'operator_is_ready':
				await interaction.reply({
					content: "🏰 **Fortress Readiness Check**\n\nTo check if your battle fortress is ready for combat, you must provide your **public IP address**:\n\n```\n/operator is-ready ip-address:YOUR_PUBLIC_IP\n```\n\n**Find your public IP using these CLI commands:**\n```bash\n# Quick methods (run any one):\ncurl ifconfig.me\ncurl icanhazip.com\ncurl ipecho.net/plain\ndig +short myip.opendns.com @resolver1.opendns.com\nwget -qO- ifconfig.me\n\n# Alternative services:\ncurl checkip.amazonaws.com\ncurl ipinfo.io/ip\ncurl api.ipify.org\n```\n\n**Other methods:**\n• Visit: https://whatismyipaddress.com/\n• Search \"what is my ip\" in Google\n• Check your VPS/cloud provider's dashboard\n\n**Note:** Your node must be on a publicly accessible server (VPS, cloud, etc.) for this check to work. Local/private networks cannot be tested remotely.",
					flags: MessageFlags.Ephemeral,
				});
				break;
				
			default:
				await interaction.reply({
					content: "Unknown button interaction.",
					flags: MessageFlags.Ephemeral,
				});
		}
	}

	/**
	 * Handle modal submissions from Discord
	 * @param interaction The modal submit interaction
	 */
	private static async handleModalSubmission(interaction: ModalSubmitInteraction): Promise<void> {
		const { customId, user } = interaction;
		
		logger.debug(`Modal submission: ${customId} by ${user.username}`);

		// Handle validator IP modal submissions
		if (customId.startsWith('validator_ip_modal_')) {
			const validatorAddress = customId.replace('validator_ip_modal_', '');
			await Discord.handleValidatorIpModalSubmission(interaction, validatorAddress);
			return;
		}

		// Default case for unknown modals
		await interaction.reply({
			content: "Unknown modal submission.",
			flags: MessageFlags.Ephemeral,
		});
	}

	/**
	 * Handle peer info modal display
	 * @param interaction The button interaction
	 * @param validatorAddress The validator address
	 */
	private static async handlePeerInfoModal(interaction: ButtonInteraction, validatorAddress: string): Promise<void> {
		try {
			// Create modal for validator IP input
			const modal = new ModalBuilder()
				.setCustomId(`validator_ip_modal_${validatorAddress}`)
				.setTitle('🌐 Connect Your Validator Node');

			// Create text input for IP address
			const ipInput = new TextInputBuilder()
				.setCustomId('validator_ip')
				.setLabel('Validator Node IP (Public/External)')
				.setPlaceholder('e.g., 188.250.220.76 (use: curl ifconfig.me) - Leave empty to clear')
				.setStyle(TextInputStyle.Short)
				.setRequired(false)
				.setMaxLength(15)
				.setMinLength(0);

			// Create text input for port (optional)
			const portInput = new TextInputBuilder()
				.setCustomId('validator_port')
				.setLabel('RPC Port (Optional - defaults to 8080)')
				.setPlaceholder('8080')
				.setStyle(TextInputStyle.Short)
				.setRequired(false)
				.setMaxLength(5)
				.setMinLength(2);

			// Create action rows with the inputs
			const ipRow = new ActionRowBuilder<TextInputBuilder>().addComponents(ipInput);
			const portRow = new ActionRowBuilder<TextInputBuilder>().addComponents(portInput);
			
			modal.addComponents(ipRow, portRow);

			// Show the modal
			await interaction.showModal(modal);

		} catch (error) {
			logger.error(error, "Error showing validator IP modal");
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: '❌ An error occurred while opening the form.',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	}

	/**
	 * Handle validator IP modal submission
	 * @param interaction The modal submit interaction
	 * @param validatorAddress The validator address
	 */
	private static async handleValidatorIpModalSubmission(interaction: ModalSubmitInteraction, validatorAddress: string): Promise<void> {
		try {
			// Get the IP and port from the modal
			const validatorIp = interaction.fields.getTextInputValue('validator_ip').trim();
			const portInput = interaction.fields.getTextInputValue('validator_port').trim();
			const port = portInput ? parseInt(portInput, 10) : 8080;

			// If IP is empty, clear the validator connection data
			if (!validatorIp) {
				// Show initial processing message
				await interaction.reply({
					content: `🧹 **Clearing validator connection data...**\n\n*Removing peer information for this validator...*`,
					flags: MessageFlags.Ephemeral
				});

				try {
					// Make API call to clear validator peer ID
					const { clientPromise } = await import("@sparta/utils/openapi/api/axios");
					const client = await clientPromise;
					await client.updateValidator({
						discordId: interaction.user.id
					}, {
						validatorAddress: validatorAddress,
						peerId: null
					});

					await interaction.editReply({
						content: `✅ **Validator Connection Cleared!**\n\n🔱 **Validator:** \`${validatorAddress.substring(0, 10)}...\`\n🧹 **Status:** Connection data removed\n\n*Your validator is no longer associated with any node connection. Use "Connect Validator" to add it back when ready.*`
					});
					return;

				} catch (apiError: any) {
					logger.error(apiError, "Error clearing validator peer info");
					
					let errorMessage = "Failed to clear peer information. Please try again.";
					if (apiError.response?.status === 404) {
						errorMessage = "Validator not found. Make sure you're registered as an operator.";
					}

					await interaction.editReply({
						content: `❌ **Failed to Clear Connection**\n\n**Error:** ${errorMessage}`
					});
					return;
				}
			}

			// Validate port if provided
			if (portInput && (isNaN(port) || port < 1 || port > 65535)) {
				await interaction.reply({
					content: '⚠️ Invalid port number. Please provide a port between 1 and 65535.',
					flags: MessageFlags.Ephemeral
				});
				return;
			}

			// Show initial processing message
			await interaction.reply({
				content: `🔍 **Connecting to your validator node...**\n\n🌐 **IP:** ${validatorIp}\n🔌 **Port:** ${port}\n\n*Please wait while we query your node for network information...*`,
				flags: MessageFlags.Ephemeral
			});

			try {
				// Query the validator node to get peer ID
				const nodeResult = await queryValidatorNode(validatorIp, port);

				if (nodeResult.error) {
					await interaction.editReply({
						content: `❌ **Connection Failed**\n\n**Error:** ${nodeResult.error}\n\n**Troubleshooting:**\n• Ensure your validator node is running\n• Check that the IP address is correct\n• Verify port ${port} is open and accessible\n• Make sure your node accepts RPC connections\n\n*Need help? Check your node logs or ask in the support channel.*`
					});
					return;
				}

				if (!nodeResult.peerId) {
					await interaction.editReply({
						content: `❌ **No Peer ID Found**\n\nYour node responded but didn't provide a valid peer ID. This might indicate:\n• The node is not fully initialized\n• The node is not an Aztec validator\n• The RPC endpoint doesn't support \`node_getEncodedEnr\`\n\n*Please ensure you're running an Aztec validator node.*`
					});
					return;
				}

				// Make API call to update validator with peer ID
				try {
					const { clientPromise } = await import("@sparta/utils/openapi/api/axios");
					const client = await clientPromise;
					await client.updateValidator({
						discordId: interaction.user.id
					}, {
						validatorAddress: validatorAddress,
						peerId: nodeResult.peerId
					});

					await interaction.editReply({
						content: `✅ **Node Connection Successful!**\n\n🔱 **Validator:** \`${validatorAddress.substring(0, 10)}...\`\n🌐 **Node IP:** ${validatorIp}:${port}\n🆔 **Peer ID:** \`${nodeResult.peerId.substring(0, 20)}...\`${nodeResult.ip ? `\n📍 **Detected IP:** ${nodeResult.ip}` : ''}${nodeResult.tcp ? `\n🔌 **TCP Port:** ${nodeResult.tcp}` : ''}\n\n🎯 **Enhanced Network Intelligence Unlocked:**\n• **Real-time Sync Status** - Monitor your node's health\n• **Geographic Location** - See where your node appears globally\n• **Network Activity** - Track when your node was last seen\n• **Connection Details** - IP and port information\n\n*Run \`/my-stats\` again to see your enhanced battle report!*`
					});

				} catch (apiError: any) {
					logger.error(apiError, "Error updating validator with peer info");
					
					let errorMessage = "Failed to update peer information. Please try again.";
					if (apiError.response?.status === 404) {
						errorMessage = "Validator not found. Make sure you're registered as an operator.";
					} else if (apiError.response?.status === 400) {
						errorMessage = "Invalid validator address or node response.";
					}

					await interaction.editReply({
						content: `❌ **Database Update Failed**\n\n**Error:** ${errorMessage}\n\n*Your node is accessible, but we couldn't save the connection. Please try again.*`
					});
				}

			} catch (nodeError) {
				logger.error(nodeError, `Error querying validator node at ${validatorIp}:${port}`);
				
				await interaction.editReply({
					content: `❌ **Node Query Failed**\n\n**Details:** Unable to connect to your validator node at ${validatorIp}:${port}\n\n**Common Issues:**\n• Node is not running or accessible\n• Firewall blocking port ${port}\n• Invalid IP address\n• Node RPC not enabled\n\n**How to Fix:**\n1. **Check Node Status:** Ensure your Aztec validator is running\n2. **Verify IP:** Use your server's public IP (check with \`curl ifconfig.me\`)\n3. **Open Ports:** Ensure port ${port} is open in your firewall\n4. **Enable RPC:** Check your node config allows RPC connections\n\n*Still having issues? Share your node logs in the support channel.*`
				});
			}

		} catch (error) {
			logger.error(error, "Error handling validator IP modal submission");
			
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: '❌ An error occurred while processing your request.',
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.editReply({
					content: '❌ An unexpected error occurred. Please try again.'
				});
			}
		}
	}
}

// --- Lazy Initialization ---
let discordInstance: Discord | null = null;

export async function getDiscordInstance(): Promise<Discord> {
	if (!discordInstance) {
		discordInstance = await Discord.new();
	}
	return discordInstance;
}

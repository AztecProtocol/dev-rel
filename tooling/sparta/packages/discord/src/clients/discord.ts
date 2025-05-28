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
} from "discord.js";
import { logger } from "@sparta/utils";
import { ApiProvider } from "@sparta/utils/openapi/api/apiProvider";
import commands from "../slashCommands/index";
import { getNodeOperatorInfo } from "../slashCommands/operators/my-stats.js";
import { get as getChainInfo } from "../slashCommands/operators/chain-info.js";
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
					content: "🏰 **Fortress Readiness Check**\n\nTo check if your battle fortress is ready for combat, you must provide your **public IP address**:\n\n```\n/operator is-ready ip-address:YOUR_PUBLIC_IP\n```\n\n**Find your public IP:**\n• Visit: https://whatismyipaddress.com/\n• Command: `curl ifconfig.me`\n• Search \"what is my ip\" in Google\n\n**Note:** Your node must be on a publicly accessible server (VPS, cloud, etc.) for this check to work. Local/private networks cannot be tested remotely.",
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
}

// --- Lazy Initialization ---
let discordInstance: Discord | null = null;

export async function getDiscordInstance(): Promise<Discord> {
	if (!discordInstance) {
		discordInstance = await Discord.new();
	}
	return discordInstance;
}

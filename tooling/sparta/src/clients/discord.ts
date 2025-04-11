/**
 * @fileoverview Discord client and utilities
 * @description Provides Discord client configuration and event handling
 * @module sparta/utils/discord
 */

import {
	Client,
	GatewayIntentBits,
	Collection,
	Interaction,
	MessageFlags,
	TextChannel,
	REST,
	Routes,
} from "discord.js";
import nodeOperatorCommands from "../roles/nodeOperators/index.js";
import adminsCommands from "../roles/admins/index.js";
import { logger } from "../utils/logger.js";

// Extended Discord client interface with commands collection
export interface ExtendedClient extends Client {
	commands: Collection<string, any>;
}

export class Discord {
	private client: ExtendedClient;

	constructor(client: ExtendedClient) {
		this.client = client;
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

			// Set up event handlers
			Discord.setupEventHandlers(client);

			// Log in to Discord
			await client.login(process.env.BOT_TOKEN);

			return new Discord(client);
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
			if (!interaction.isChatInputCommand()) return;

			const command = client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				const channel = interaction.channel as TextChannel;

				const reply = await command.execute(interaction);
				logger.info(
					{
						name: interaction.commandName,
						channel: channel.name,
						user: interaction.user.username,
						date: interaction.createdAt,
						result: reply,
					},
					"Command executed"
				);
			} catch (error) {
				logger.error(
					{ error, command: interaction.commandName },
					"Error executing command"
				);
				await interaction.reply({
					content: "There was an error executing this command!",
					flags: MessageFlags.Ephemeral,
				});
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
			logger.info("Started refreshing application (/) commands");

			const commandsData = Object.values({
				...nodeOperatorCommands,
				...adminsCommands,
			}).map((command) => command.data.toJSON());

			await rest.put(
				Routes.applicationGuildCommands(
					process.env.BOT_CLIENT_ID as string,
					process.env.GUILD_ID as string
				),
				{
					body: commandsData,
				}
			);

			for (const command of Object.values({
				...nodeOperatorCommands,
				...adminsCommands,
			})) {
				client.commands.set(command.data.name, command);
				logger.debug(`Registered command: ${command.data.name}`);
			}

			logger.info("Successfully reloaded application (/) commands");
		} catch (error) {
			logger.error({ error }, "Error deploying commands");
		}
	}

	/**
	 * Gets the Discord client
	 */
	getClient = () => {
		return this.client;
	};

	/**
	 * Finds a guild by ID
	 */
	getGuild = async (guildId: string) => {
		return await this.client.guilds.fetch(guildId);
	};
}

// Create and export a shared Discord instance
export const discord = await Discord.new();

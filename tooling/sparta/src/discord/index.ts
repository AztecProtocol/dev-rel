/**
 * @fileoverview Discord bot service implementation
 * @description Handles Discord bot initialization, command registration, and event handling
 * @module sparta/discord
 */

import {
	Client,
	GatewayIntentBits,
	Collection,
	Interaction,
	MessageFlags,
} from "discord.js";
import { deployCommands } from "../utils/deploy-commands.js";
import usersCommands from "../commands/index.js";
import adminsCommands from "../admins/index.js";

/**
 * Extended Discord client interface with commands collection
 * @interface ExtendedClient
 * @extends {Client}
 */
interface ExtendedClient extends Client {
	commands: Collection<string, any>;
}

// Initialize Discord client with required intents
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
}) as ExtendedClient;

// Initialize commands collection
client.commands = new Collection();

// Register all commands from both users and admins
for (const command of Object.values({ ...usersCommands, ...adminsCommands })) {
	client.commands.set(command.data.name, command);
}

console.log("Starting discord service...");

/**
 * Error event handler
 */
client.once("error", (error) => {
	console.error("Error:", error);
});

/**
 * Ready event handler - called when bot is initialized
 */
client.once("ready", async () => {
	console.log("Sparta bot is ready!");
	console.log("Bot Client ID: ", process.env.BOT_CLIENT_ID);
	deployCommands();
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
		console.log("Executing command:", command.data.name);
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({
			content: "There was an error executing this command!",
			flags: MessageFlags.Ephemeral,
		});
	}
});

client.login(process.env.BOT_TOKEN);

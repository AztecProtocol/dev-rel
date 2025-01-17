import {
	Client,
	GatewayIntentBits,
	Collection,
	Interaction,
	MessageFlags,
} from "discord.js";
import { deployCommands } from "./deploy-commands.js";
import commands from "./commands/index.js";
import {
	BOT_TOKEN,
	DEV_CHANNEL_ID,
	ENVIRONMENT,
	PROD_CHANNEL_ID,
} from "./env.js";

// Extend the Client class to include the commands property
interface ExtendedClient extends Client {
	commands: Collection<string, any>;
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
}) as ExtendedClient;

client.commands = new Collection();

for (const command of Object.values(commands)) {
	client.commands.set(command.data.name, command);
}

client.once("ready", () => {
	console.log("Sparta bot is ready!");
	deployCommands();
});

client.on("interactionCreate", async (interaction: Interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const { channelId } = interaction;
	if (
		(ENVIRONMENT === "production" && channelId !== PROD_CHANNEL_ID) ||
		(ENVIRONMENT === "development" && channelId !== DEV_CHANNEL_ID)
	) {
		console.log(`Ignoring interaction in channel ${channelId}`);
		return;
	}

	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	try {
		console.log("Executing command:", command.data.name);
		const response = await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({
			content: "There was an error executing this command!",
			flags: MessageFlags.Ephemeral,
		});
	}
});

client.login(BOT_TOKEN);

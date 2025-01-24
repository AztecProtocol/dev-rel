import {
	Client,
	GatewayIntentBits,
	Collection,
	Interaction,
	MessageFlags,
} from "discord.js";
import { deployCommands } from "./utils/deploy-commands.js";
import usersCommands from "./commands/index.js";
import adminsCommands from "./admins/index.js";

// Extend the Client class to include the commands property
interface ExtendedClient extends Client {
	commands: Collection<string, any>;
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
}) as ExtendedClient;

client.commands = new Collection();

for (const command of Object.values({ ...usersCommands, ...adminsCommands })) {
	client.commands.set(command.data.name, command);
}

client.once("ready", () => {
	console.log("Sparta bot is ready!");
	deployCommands();
});

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

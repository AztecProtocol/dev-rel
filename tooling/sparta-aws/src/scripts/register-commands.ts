import { REST } from "@discordjs/rest";
import { Routes } from "discord.js";
import dotenv from "dotenv";
import { addValidator } from "../commands/addValidator.js";
import { getChainInfo } from "../commands/getChainInfo.js";
import { adminValidators } from "../commands/adminValidators.js";

dotenv.config();

const commands = [
	addValidator.data.toJSON(),
	getChainInfo.data.toJSON(),
	adminValidators.data.toJSON(),
];

const isDev = process.env["ENVIRONMENT"] === "development";
const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
	console.error("Missing required environment variables");
	process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN as string);

async function main() {
	try {
		console.log(
			`Started refreshing application (/) commands for ${
				isDev ? "development" : "production"
			} environment.`
		);

		await rest.put(
			Routes.applicationGuildCommands(
				DISCORD_CLIENT_ID as string,
				DISCORD_GUILD_ID as string
			),
			{ body: commands }
		);

		console.log("Successfully reloaded application (/) commands.");
	} catch (error) {
		console.error("Error registering commands:", error);
	}
}

main();

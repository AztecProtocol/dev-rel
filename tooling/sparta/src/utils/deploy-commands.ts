import { REST, Routes } from "discord.js";
import usersCommands from "../commands/index.js";
import adminsCommands from "../admins/index.js";

export const deployCommands = async (): Promise<void> => {
	const rest = new REST({ version: "10" }).setToken(
		process.env.BOT_TOKEN as string
	);

	try {
		console.log("Started refreshing application (/) commands.");

		const commandsData = Object.values({
			...usersCommands,
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

		console.log("Successfully reloaded application (/) commands.");
	} catch (error) {
		console.error(error);
	}
};

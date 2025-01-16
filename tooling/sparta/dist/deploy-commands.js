import { REST, Routes } from "discord.js";
import commands from "./commands/index.js";
import { BOT_TOKEN, BOT_CLIENT_ID, GUILD_ID } from "./env.js";
export const deployCommands = async () => {
    const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
    try {
        console.log("Started refreshing application (/) commands.");
        const commandsData = Object.values(commands).map((command) => command.data.toJSON());
        await rest.put(Routes.applicationGuildCommands(BOT_CLIENT_ID, GUILD_ID), {
            body: commandsData,
        });
        console.log("Successfully reloaded application (/) commands.");
    }
    catch (error) {
        console.error(error);
    }
};

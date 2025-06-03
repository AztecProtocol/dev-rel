import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { get as getChainInfo } from "./info.js";
import { logger } from "@sparta/utils";
import {
    AztecSubcommandGroups,
    AztecSubcommands,
} from "../../types.js";

export default {
	data: new SlashCommandBuilder()
		.setName(AztecSubcommandGroups.Aztec)
		.setDescription("👤 Aztec Network commands")
		.addSubcommand((subcommand) =>
			subcommand	
				.setName(AztecSubcommands.Info)
				.setDescription("🏛️ Survey the Aztec Network battlefield status")
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		try {
			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case AztecSubcommands.Info:
					await getChainInfo(interaction);
					break;
				default:
					await interaction.editReply({
						content: `⚔️ Unknown command: ${subcommand}`,
					});
					return "Invalid subcommand";
			}
			// Add explicit return after successful command execution
			return;
		} catch (error) {
			logger.error("Failed to execute operator command:", error);
			return; // Keep explicit return
		}
	},
};

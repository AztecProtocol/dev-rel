import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	// EmbedBuilder, // Unused
	// MessageFlags, // Already commented out
} from "discord.js";
import {
    AdminSubcommandGroups,
	AdminSubcommands
} from "@sparta/utils";
import {getValidatorStats} from "./get.js";
import { logger } from "@sparta/utils";

export default {
	data: new SlashCommandBuilder()
		.setName(AdminSubcommandGroups.Admin)
		.setDescription("Admin commands")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(AdminSubcommands.Get)
				.setDescription("Get validator stats")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator address to check")
						.setRequired(true)
				)	
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		try {
			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case AdminSubcommands.Get:
					await getValidatorStats(interaction);
					break;
				default:
					await interaction.editReply({
						content: `Invalid subcommand: ${subcommand}`,
					});
					return "Invalid subcommand";
			}
			// Add explicit return after successful command execution
			return;
		} catch (error) {
			logger.error("Failed to get info:", error);
			// Cannot make editReply ephemeral, only initial reply
			await interaction.editReply({
				content: "Something went wrong while fetching info.",
			});
			return; // Keep explicit return
		}
	},
};

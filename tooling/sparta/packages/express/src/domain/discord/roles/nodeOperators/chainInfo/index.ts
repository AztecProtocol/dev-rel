import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	// EmbedBuilder, // Unused
	// MessageFlags, // Already commented out
} from "discord.js";
import {
	NodeOperatorSubcommandGroups,
	NodeOperatorSubcommands,
} from "@sparta/utils";
import { get } from "./get.js";
import { logger } from "@sparta/utils";

export default {
	data: new SlashCommandBuilder()
		.setName(NodeOperatorSubcommandGroups.Operator)
		.setDescription("Node operator commands")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.ChainInfo)
				.setDescription("Get chain information")
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		try {
			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case NodeOperatorSubcommands.ChainInfo:
					await get(interaction);
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
			logger.error("Failed to fetch chain info:", error);
			// Cannot make editReply ephemeral, only initial reply
			await interaction.editReply({
				content: "Something went wrong while fetching chain info.",
			});
			return; // Keep explicit return
		}
	},
};

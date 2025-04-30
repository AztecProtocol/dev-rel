import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { get as getChainInfo } from "./chain-info.js";
import { logger } from "@sparta/utils";
import {
	NodeOperatorSubcommandGroups,
	NodeOperatorSubcommands,
} from "../../types.js";
import { getValidatorStats } from "./my-info.js";

export default {
	data: new SlashCommandBuilder()
		.setName(NodeOperatorSubcommandGroups.Operator)
		.setDescription("Node operator commands")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.MyStats)
				.setDescription("Check your validator stats")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator address to check")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.ChainInfo)
				.setDescription("Get chain information")
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		try {
			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case NodeOperatorSubcommands.MyStats:
					await getValidatorStats(interaction);
					break;
				case NodeOperatorSubcommands.ChainInfo:
					await getChainInfo(interaction);
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
			logger.error("Failed to execute operator command:", error);
			await interaction.editReply({
				content: "Something went wrong while executing the command.",
			});
			return; // Keep explicit return
		}
	},
};

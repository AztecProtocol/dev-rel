import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
} from "discord.js";
import {
	NodeOperatorSubcommandGroups,
	NodeOperatorSubcommands,
} from "../../../const.js";
import { get } from "./get.js";

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
		} catch (error) {
			await interaction.editReply({
				content: `Failed with error: ${error}`,
			});
			return `Failed with error: ${
				error instanceof Error && error.message
			}`;
		}
	},
};

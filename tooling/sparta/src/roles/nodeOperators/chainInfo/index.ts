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
	execute: async (
		interaction: ChatInputCommandInteraction
	): Promise<string> => {
		try {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case NodeOperatorSubcommands.ChainInfo:
					await get(interaction);
					return `Retrieved chain info`;
				default:
					await interaction.editReply({
						content: `Unknown subcommand: ${subcommand}`,
					});
					return `Unknown subcommand`;
			}
		} catch (error) {
			await interaction.editReply({
				content: `Failed with error: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			});
			return `Failed with error: ${
				error instanceof Error ? error.message : "Unknown error"
			}`;
		}
	},
};

import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
} from "discord.js";
import {
	ValidatorSubcommandGroups,
	ValidatorSubcommands,
} from "@sparta/utils";
import { check } from "./check.js";

export default {
	data: new SlashCommandBuilder()
		.setName(ValidatorSubcommandGroups.Validator)
		.setDescription("Validator commands for Node Operator users")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(ValidatorSubcommands.Check)
				.setDescription("Check if you are a validator")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator address to check")
						.setRequired(true)
				)
		),
	execute: async (
		interaction: ChatInputCommandInteraction
	): Promise<string> => {
		try {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case ValidatorSubcommands.Check:
					await check(interaction);
					return `Checked validator`;
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

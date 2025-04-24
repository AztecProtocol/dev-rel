import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
} from "discord.js";
import { getCommittee } from "./getCommittee.js";
import { getValidators } from "./getValidators.js";
// import { fund } from "./fund.js"; // Unused
import { AdminSubcommands } from "@sparta/utils";

export default {
	data: new SlashCommandBuilder()
		.setName("admin")
		.setDescription("Admin commands")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommandGroup((group) =>
			group
				.setName(AdminSubcommands.Get)
				.setDescription("Get info about validators")
				.addSubcommand((subcommand) =>
					subcommand
						.setName(AdminSubcommands.Validators)
						.setDescription("Get validators")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName(AdminSubcommands.Committee)
						.setDescription("Get committee")
				)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral,
		});

		try {
			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case AdminSubcommands.Committee:
					return getCommittee(interaction);
				case AdminSubcommands.Validators:
					return getValidators(interaction);
				// case AdminSubcommands.Fund:
				//   return fund(interaction);
				default:
					await interaction.reply({
						content: "Unknown admin validator subcommand.",
						ephemeral: true,
					});
					return;
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

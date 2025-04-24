import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
} from "discord.js";
import { getCommittee } from "./getCommittee.js";
import { getValidators } from "./getValidators.js";
import { fund } from "./fund.js";
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
					await getCommittee(interaction);
					break;
				case AdminSubcommands.Validators:
					await getValidators(interaction);
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

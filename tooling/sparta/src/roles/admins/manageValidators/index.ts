import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
} from "discord.js";
import { getCommittee } from "./getCommittee.js";
import { getValidators } from "./getValidators.js";
import { fund } from "./fund.js";
import { remove } from "./remove.js";
import { AdminSubcommands } from "../../../const.js";

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
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(AdminSubcommands.Remove)
				.setDescription("Remove a validator")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator to remove")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(AdminSubcommands.Fund)
				.setDescription("Fund a validator with Sepolia ETH")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator to fund")
						.setRequired(true)
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
				case AdminSubcommands.Remove:
					await remove(interaction);
					break;
				case AdminSubcommands.Fund:
					await fund(interaction);
					break;
				default:
					await interaction.editReply({
						content: `Invalid subcommand: ${subcommand}`,
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

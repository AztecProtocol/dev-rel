import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
} from "discord.js";
import { ChainInfoService } from "../services/chaininfo-service.js";
import { paginate } from "../utils/pagination.js";

export default {
	data: new SlashCommandBuilder()
		.setName("admin-info")
		.setDescription("Get admin info about the chain ")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("validators")
				.setDescription("Get the current list of validators")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("committee")
				.setDescription("Get the current committee")
		),

	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral,
		});

		try {
			const addressesPerPage = 40;

			const { validators, committee } = await ChainInfoService.getInfo();
			if (interaction.options.getSubcommand() === "committee") {
				await paginate(
					committee as string[],
					addressesPerPage,
					interaction,
					"Committee"
				);
			} else if (interaction.options.getSubcommand() === "validators") {
				await paginate(
					validators as string[],
					addressesPerPage,
					interaction,
					"Validators"
				);

				return;
			}
		} catch (error) {
			console.error("Error in get-info command:", error);
			await interaction.editReply({
				content: `Failed to get chain info`,
			});
		}
	},
};

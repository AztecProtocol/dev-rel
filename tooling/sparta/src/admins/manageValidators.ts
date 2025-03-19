import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
} from "discord.js";
import { ChainInfoService } from "../services/chaininfo-service.js";
import { paginate } from "../utils/pagination.js";
import { ValidatorService } from "../services/validator-service.js";
import { validateAddress } from "../utils/inputValidator.js";

export default {
	data: new SlashCommandBuilder()
		.setName("admin")
		.setDescription("Admin commands")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommandGroup((group) =>
			group
				.setName("get")
				.setDescription("Get info about validators")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("validators")
						.setDescription("Get validators")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("committee")
						.setDescription("Get committee")
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("add")
				.setDescription("Add a validator")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator to add")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("remove")
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
				.setName("fund")
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
			const addressesPerPage = 20;

			const {
				validators,
				forwardedValidators,
				committee,
				forwardedCommittee,
			} = await ChainInfoService.getInfo();
			if (interaction.options.getSubcommand() === "committee") {
				await paginate(
					committee.map(
						(c, i) => `${c} -> ${forwardedCommittee[i]}`
					) as string[],
					committee.length,
					addressesPerPage,
					interaction,
					"Committee (Forwarders)"
				);
				return "Checked committee";
			} else if (interaction.options.getSubcommand() === "validators") {
				await paginate(
					validators.map(
						(v, i) => `${v} -> ${forwardedValidators[i]}`
					) as string[],
					validators.length,
					addressesPerPage,
					interaction,
					"Validators (Forwarders)"
				);
				return "Checked validators";
			} else if (interaction.options.getSubcommand() === "remove") {
				const address = interaction.options.getString("address");
				if (!address) {
					await interaction.editReply({
						content: "Please provide an address to remove",
					});
					return `Failed`;
				}
				await ValidatorService.removeValidator(address);
				await interaction.editReply({
					content: `Removed validator ${address}`,
				});
				return "Removed validator";
			} else if (interaction.options.getSubcommand() === "add") {
				const address = interaction.options.getString("address");

				if (!address) {
					await interaction.editReply({
						content: "Please provide an address to add",
					});
					return `Failed`;
				}

				if (validateAddress(address)) {
					await interaction.editReply({
						content: "Please provide a valid Ethereum address.",
					});
					return `Failed`;
				}

				await ValidatorService.addValidator(address);
				await interaction.editReply({
					content: `Successfully added validator address: ${address}`,
				});
				return `Added validator ${address}`;
			} else if (interaction.options.getSubcommand() === "fund") {
				const address = interaction.options.getString("address");
				if (!address) {
					await interaction.editReply({
						content: "Please provide an address to fund",
					});
					return `Failed`;
				}
				if (validateAddress(address)) {
					await interaction.editReply({
						content: "Please provide a valid Ethereum address.",
					});
					return `Failed`;
				}
				await ValidatorService.fundValidator(address);
				await interaction.editReply({
					content: `Successfully funded validator ${address}`,
				});
			}
			return;
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

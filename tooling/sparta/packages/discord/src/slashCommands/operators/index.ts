import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { get as getChainInfo } from "./chain-info.js";
import { logger } from "@sparta/utils";
import {
	NodeOperatorSubcommandGroups,
	NodeOperatorSubcommands,
} from "../../types.js";
import { getNodeOperatorInfo } from "./my-stats.js";
import { registerValidator } from "./register.js";
import { showOperatorHelp } from "./help.js";
import { addValidator } from "./add-validator.js";

export default {
	data: new SlashCommandBuilder()
		.setName(NodeOperatorSubcommandGroups.Operator)
		.setDescription("Node operator commands")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.MyStats)
				.setDescription("Check your node operator status and validator stats")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.ChainInfo)
				.setDescription("Get chain information")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.Start)
				.setDescription("Register your validator")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("Your validator address")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("block-number")
						.setDescription("Block number for verification")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("proof")
						.setDescription("Your sync proof")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.AddValidator)
				.setDescription("Add a new validator to your account")
				.addStringOption((option) =>
					option
						.setName("validator-address")
						.setDescription("The validator address to add")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.Help)
				.setDescription("Display help information for node operators")
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		try {
			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case NodeOperatorSubcommands.MyStats:
					await getNodeOperatorInfo(interaction);
					break;
				case NodeOperatorSubcommands.ChainInfo:
					await getChainInfo(interaction);
					break;
				case NodeOperatorSubcommands.Start:
					await registerValidator(interaction);
					break;
				case NodeOperatorSubcommands.Help:
					await showOperatorHelp(interaction);
					break;
				case NodeOperatorSubcommands.AddValidator:
					await addValidator(interaction);
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
			return; // Keep explicit return
		}
	},
};

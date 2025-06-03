import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { logger } from "@sparta/utils";
import {
	NodeOperatorSubcommandGroups,
	NodeOperatorSubcommands,
} from "../../types.js";
import { getNodeOperatorInfo } from "./my-stats.js";
import { showOperatorHelp } from "./help.js";
import { addValidator } from "./add-validator.js";
import { checkNodeReadiness } from "./is-ready.js";

export default {
	data: new SlashCommandBuilder()
		.setName(NodeOperatorSubcommandGroups.Operator)
		.setDescription("⚔️ Spartan warrior commands for Aztec Network operations")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.Help)
				.setDescription("📜 View Spartan command arsenal and battle instructions")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.MyStats)
				.setDescription("🛡️ Check your warrior status and validator battle performance")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.AddValidator)
				.setDescription("🗡️ Deploy additional validator to the front lines")
				.addStringOption((option) =>
					option
						.setName("validator-address")
						.setDescription("Battle address of the validator to deploy")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.IsReady)
				.setDescription("🏰 Check if your battle fortress is ready for combat")
				.addStringOption((option) =>
					option
						.setName("ip-address")
						.setDescription("Your fortress IP address for readiness inspection")
						.setRequired(false)
				)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		try {
			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case NodeOperatorSubcommands.Help:
					await showOperatorHelp(interaction);
					break;
				case NodeOperatorSubcommands.MyStats:
					await getNodeOperatorInfo(interaction);
					break;
				case NodeOperatorSubcommands.AddValidator:
					await addValidator(interaction);
					break;
				case NodeOperatorSubcommands.IsReady:
					await checkNodeReadiness(interaction);
					break;
				default:
					await interaction.editReply({
						content: `⚔️ Unknown battle command: ${subcommand} - Consult the command scroll!`,
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

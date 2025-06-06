import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { logger } from "@sparta/utils";
import {
	NodeOperatorSubcommandGroups,
	NodeOperatorSubcommands,
} from "../../types.js";
import { getNodeOperatorInfo } from "./my-stats.js";
import { showOperatorHelp } from "./help.js";
import { checkNodeReadiness } from "./is-ready.js";
import { verifyDiscordAccount } from "./verify-discord.js";

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
				.setName(NodeOperatorSubcommands.IsReady)
				.setDescription("🏰 Check if your battle fortress is ready for combat")
				.addStringOption((option) =>
					option
						.setName("ip-address")
						.setDescription("Your fortress IP address for readiness inspection")
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(NodeOperatorSubcommands.VerifyDiscord)
				.setDescription("🔗 Verify your Discord account with your operator address")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("Your operator wallet address")
						.setRequired(true)
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
				case NodeOperatorSubcommands.IsReady:
					await checkNodeReadiness(interaction);
					break;
				case NodeOperatorSubcommands.VerifyDiscord:
					await verifyDiscordAccount(interaction);
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

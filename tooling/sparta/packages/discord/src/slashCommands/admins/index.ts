import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
} from "discord.js";
// import { getValidatorStats } from "./get-operator-stats.js";
import { logger } from "@sparta/utils";
import { AdminSubcommandGroups, AdminSubcommands } from "../../types.js";
import { isOperatorInSet } from "./operator-in-set.js";
import { isOperatorAttesting } from "./operator-attesting.js";
import { showAdminHelp } from "./help.js";
import { checkAdminPermissions } from "../../utils";

export default {
	data: new SlashCommandBuilder()
		.setName(AdminSubcommandGroups.Admin)
		.setDescription("Admin commands")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(AdminSubcommands.IsInSet)
				.setDescription(
					"Get whether an address is in the validator set"
				)
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator address to check")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(AdminSubcommands.IsAttesting)
				.setDescription("Get whether an address is attesting")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator address to check")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(AdminSubcommands.Help)
				.setDescription("Display help for admin commands")
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		try {
			// Check if the user has permission to use admin commands
			// This checks against the defined admin roles and provides appropriate error messages
			if (!(await checkAdminPermissions(interaction))) {
				// The checkAdminPermissions function already sent a reply if the user doesn't have permission
				return "Insufficient permissions";
			}

			// Defer the reply after permission check to avoid timeout issues
			// For commands that might take longer to process
			await interaction.deferReply();

			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case AdminSubcommands.IsInSet:
					await isOperatorInSet(interaction);
					break;
				case AdminSubcommands.IsAttesting:
					await isOperatorAttesting(interaction);
					break;
				case AdminSubcommands.Help:
					await showAdminHelp(interaction);
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
			console.log(error);
			logger.error("Failed to get info:", { error });
			try {
				// Check if the reply has been deferred
				await interaction.editReply({
					content: "Something went wrong while fetching info.",
				});
			} catch (replyError) {
				// If editReply fails (e.g., not deferred), use reply instead
				try {
					await interaction.reply({
						content: "Something went wrong while fetching info.",
						flags: MessageFlags.Ephemeral,
					});
				} catch (finalError) {
					logger.error("Failed to send error response:", finalError);
				}
			}
			return "Error executing command"; // Keep explicit return
		}
	},
};

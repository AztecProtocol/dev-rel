import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
} from "discord.js";
// import { getValidatorStats } from "./get-operator-stats.js";
import { logger } from "@sparta/utils";
import {
	ModeratorSubcommandGroups,
	ModeratorSubcommands,
} from "../../types.js";
import { isOperatorInSet } from "./operator-in-set.js";
import { isOperatorAttesting } from "./operator-attesting.js";
import { showModeratorHelp } from "./help.js";
import { checkModeratorPermissions } from "../../utils/index.js";
import { approveUser } from "./operator-approve.js";

export default {
	data: new SlashCommandBuilder()
		.setName(ModeratorSubcommandGroups.Moderator)
		.setDescription("Moderator commands")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(ModeratorSubcommands.IsInSet)
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
				.setName(ModeratorSubcommands.IsAttesting)
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
				.setName(ModeratorSubcommands.Approve)
				.setDescription("Approve a user to join the validator set")
				.addStringOption((option) =>
					option
						.setName("user")
						.setDescription("The Discord username of the user to approve")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(ModeratorSubcommands.Help)
				.setDescription("Display help for moderator commands")
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		try {
			// Check if the user has permission to use moderator commands
			// This checks against the defined moderator roles and provides appropriate error messages
			if (!(await checkModeratorPermissions(interaction))) {
				// The checkModeratorPermissions function already sent a reply if the user doesn't have permission
				return "Insufficient permissions";
			}

			// Defer the reply after permission check to avoid timeout issues
			// For commands that might take longer to process
			await interaction.deferReply();

			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case ModeratorSubcommands.IsInSet:
					await isOperatorInSet(interaction);
					break;
				case ModeratorSubcommands.IsAttesting:
					await isOperatorAttesting(interaction);
					break;
				case ModeratorSubcommands.Approve:
					await approveUser(interaction);
					break;
				case ModeratorSubcommands.Help:
					await showModeratorHelp(interaction);
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

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
import { showModeratorHelp } from "./help.js";
import { checkModeratorPermissions } from "../../utils/index.js";
import { approveUser } from "./operator-approve.js";
import { unapproveUser } from "./operator-unapprove.js";
import { getOperatorInfo } from "./operator-info.js";
import { addValidator } from "./add-validator.js";

export default {
	data: new SlashCommandBuilder()
		.setName(ModeratorSubcommandGroups.Moderator)
		.setDescription("Moderator commands")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(ModeratorSubcommands.Info)
				.setDescription("Get comprehensive information about a node operator")
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("The Discord username of the operator (preferred)")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName("user-id")
						.setDescription("The Discord ID of the operator (alternative)")
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(ModeratorSubcommands.Approve)
				.setDescription("Approve a user to join the validator set")
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("The Discord username of the user to approve (preferred)")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName("user-id")
						.setDescription("The Discord ID of the user to approve (alternative)")
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(ModeratorSubcommands.Unapprove)
				.setDescription("Unapprove a user from the validator set")
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("The Discord username of the user to unapprove (preferred)")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName("user-id")
						.setDescription("The Discord ID of the user to unapprove (alternative)")
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(ModeratorSubcommands.AddValidator)
				.setDescription("Add one or more validators to an operator")
				.addStringOption((option) =>
					option
						.setName("validator-addresses")
						.setDescription("Comma-separated list of validator addresses")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("The Discord username of the user to add (preferred)")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName("user-id")
						.setDescription("The Discord ID of the user to add (alternative)")
						.setRequired(false)
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
			await interaction.deferReply({
				flags: MessageFlags.Ephemeral,
			});

			const subcommand = interaction.options.getSubcommand();
			switch (subcommand) {
				case ModeratorSubcommands.Info:
					await getOperatorInfo(interaction);
					break;
				case ModeratorSubcommands.Approve:
					await approveUser(interaction);
					break;
				case ModeratorSubcommands.Unapprove:
					await unapproveUser(interaction);
					break;
				case ModeratorSubcommands.Help:
					await showModeratorHelp(interaction);
					break;
				case ModeratorSubcommands.AddValidator:
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

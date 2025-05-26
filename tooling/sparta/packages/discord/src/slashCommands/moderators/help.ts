/**
 * @fileoverview Moderator help command handler
 * @description Handles Discord command for displaying moderator command documentation
 * @module sparta/discord/roles/moderators/help
 */

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import { ModeratorSubcommands } from "../../types.js";
import { getAllowedChannelsText } from "@sparta/utils";
import { MODERATOR_ROLES } from "@sparta/utils/const/roles.js";
/**
 * Display help information for all moderator commands
 */
export async function showModeratorHelp(
	interaction: ChatInputCommandInteraction
): Promise<string> {
	try {
		// No need to defer reply here since it's already deferred in the parent command

		// Create a formatted embed for the command help
		const embed = new EmbedBuilder()
			.setTitle("Moderator Commands Help")
			.setDescription(
				"List of available moderator commands and their usage"
			)
			.setColor(0x2b65ec) // Blue color for help message
			.addFields([
				{
					name: "Moderator Permissions",
					value:
						"These commands are restricted to users with the following roles:\n" +
						Object.values(MODERATOR_ROLES)
							.map((role) => `• \`${role.name}\``)
							.join("\n"),
					inline: false,
				},
				{
					name: "Channel Restrictions",
					value: `Moderator commands can only be used in ${getAllowedChannelsText()} ${
						process.env.NODE_ENV === "production"
							? "channels"
							: "channel"
					}.`,
					inline: false,
				},
				{
					name: `/mod ${ModeratorSubcommands.Help}`,
					value: "Display this help message listing all moderator commands",
					inline: false,
				},
				{
					name: `/mod ${ModeratorSubcommands.Info}`,
					value: "Get comprehensive information about a node operator\n`username` - The Discord username of the operator (required)\n\nThis command shows:\n• Operator details (wallet, approval status)\n• Validator information (in set, attesting status, miss percentage)",
					inline: false,
				},
				{
					name: `/mod ${ModeratorSubcommands.ApproveByUsername}`,
					value: "Approve a user to join the validator set\n`username` - The Discord username of the user to approve (required)",
					inline: false,
				},{
					name: `/mod ${ModeratorSubcommands.ApproveById}`,
					value: "Approve a user to join the validator set\n`user-id` - The Discord ID of the user to approve (required)",
					inline: false,
				},
				{
					name: `/mod ${ModeratorSubcommands.AddValidator}`,
					value: "Add a validator to the validator set\n`user` - The Discord username of the user to add (required)\n`validator-address` - The validator address to add (required)",
					inline: false,
				},
			])
			.setFooter({
				text: "Use these commands to manage and monitor validator operations",
			})
			.setTimestamp();

		await interaction.editReply({
			embeds: [embed],
		});

		return "Moderator help displayed successfully";
	} catch (error) {
		logger.error("Error displaying moderator help:", error);
		await interaction.editReply({
			content: "Error displaying moderator help information.",
		});
		throw error;
	}
}

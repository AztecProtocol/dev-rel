/**
 * @fileoverview Admin help command handler
 * @description Handles Discord command for displaying admin command documentation
 * @module sparta/discord/roles/admins/help
 */

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import { AdminSubcommands } from "../../types.js";
import { ADMIN_ROLES, CHANNELS, getAllowedChannelsText } from "../../utils";

/**
 * Display help information for all admin commands
 */
export async function showAdminHelp(
	interaction: ChatInputCommandInteraction
): Promise<string> {
	try {
		// No need to defer reply here since it's already deferred in the parent command

		// Create a formatted embed for the command help
		const embed = new EmbedBuilder()
			.setTitle("Admin Commands Help")
			.setDescription("List of available admin commands and their usage")
			.setColor(0x2b65ec) // Blue color for help message
			.addFields([
				{
					name: "Admin Permissions",
					value:
						"These commands are restricted to users with the following roles:\n" +
						Object.values(ADMIN_ROLES)
							.map((role) => `• \`${role.name}\``)
							.join("\n"),
					inline: false,
				},
				{
					name: "Channel Restrictions",
					value: `Admin commands can only be used in ${getAllowedChannelsText()} ${
						process.env.NODE_ENV === "production"
							? "channels"
							: "channel"
					}.`,
					inline: false,
				},
				{
					name: `/admin ${AdminSubcommands.Help}`,
					value: "Display this help message listing all admin commands",
					inline: false,
				},
				{
					name: `/admin ${AdminSubcommands.IsInSet}`,
					value: "Check if an address is in the current validator set\n`address` - The validator address to check (required)",
					inline: false,
				},
				{
					name: `/admin ${AdminSubcommands.IsAttesting}`,
					value: "Check if an address is actively attesting\n`address` - The validator address to check (required)",
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

		return "Admin help displayed successfully";
	} catch (error) {
		logger.error("Error displaying admin help:", error);
		await interaction.editReply({
			content: "Error displaying admin help information.",
		});
		throw error;
	}
}

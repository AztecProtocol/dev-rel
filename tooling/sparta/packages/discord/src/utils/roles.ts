/**
 * @fileoverview Role-based access control utilities
 * @description Provides utilities for checking user roles and permissions
 * @module sparta/discord/utils/roles
 */

import {
	ChatInputCommandInteraction,
	GuildMember,
	TextChannel,
	MessageFlags,
} from "discord.js";
import { isAllowedChannel, getAllowedChannelsText } from "./channels";

/**
 * Moderator role definitions mapping role names to their Discord IDs
 */
export const MODERATOR_ROLES = {
	AZTEC_LABS_TEAM: { name: "Aztec Labs Team", id: "1144693819015700620" },
	AZMOD: { name: "AzMod", id: "1362901049803018513" },
	ADMIN: { name: "Admin", id: "1146246812299165817" },
};

/**
 * User role definitions mapping role names to their Discord IDs
 */
export const USER_ROLES = {
	APPRENTICE: { name: "Apprentice", id: "1366916508072148992" },
};

/**
 * Checks if the user has any of the specified moderator roles
 * @param member The guild member to check
 * @returns True if the user has any moderator role, false otherwise
 */
export function hasModeratorRole(member: GuildMember): boolean {
	const moderatorRoleIds = Object.values(MODERATOR_ROLES).map(
		(role) => role.id
	);
	return member.roles.cache.some((role) =>
		moderatorRoleIds.includes(role.id)
	);
}

/**
 * Checks if the interaction user has moderator permissions and is in an allowed channel
 * @param interaction The Discord interaction
 * @returns True if the user has moderator permissions and is in an allowed channel, false otherwise
 */
export async function checkModeratorPermissions(
	interaction: ChatInputCommandInteraction
): Promise<boolean> {
	// Get the member from the interaction
	const member = interaction.member as GuildMember;
	const channel = interaction.channel as TextChannel;

	if (!member) {
		await interaction.reply({
			content:
				"Could not verify your server membership. Please try again.",
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	// Check if the channel is allowed
	if (!channel || !isAllowedChannel(channel)) {
		await interaction.reply({
			content: `This command can only be used in ${getAllowedChannelsText()} channels.`,
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	// Check if the member has moderator roles
	if (!hasModeratorRole(member)) {
		await interaction.reply({
			content:
				"You don't have permission to use moderator commands. This command requires one of these roles: " +
				Object.values(MODERATOR_ROLES)
					.map((role) => `\`${role.name}\``)
					.join(", "),
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	return true;
}

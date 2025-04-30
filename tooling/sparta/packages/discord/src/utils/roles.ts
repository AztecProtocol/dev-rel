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
 * Admin role definitions mapping role names to their Discord IDs
 */
export const ADMIN_ROLES = {
	AZTEC_LABS_TEAM: { name: "Aztec Labs Team", id: "1144693819015700620" },
	AZMOD: { name: "AzMod", id: "1362901049803018513" },
	ADMIN: { name: "Admin", id: "1146246812299165817" },
};

/**
 * Checks if the user has any of the specified admin roles
 * @param member The guild member to check
 * @returns True if the user has any admin role, false otherwise
 */
export function hasAdminRole(member: GuildMember): boolean {
	const adminRoleIds = Object.values(ADMIN_ROLES).map((role) => role.id);
	return member.roles.cache.some((role) => adminRoleIds.includes(role.id));
}

/**
 * Checks if the interaction user has admin permissions and is in an allowed channel
 * @param interaction The Discord interaction
 * @returns True if the user has admin permissions and is in an allowed channel, false otherwise
 */
export async function checkAdminPermissions(
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

	// Check if the member has admin roles
	if (!hasAdminRole(member)) {
		await interaction.reply({
			content:
				"You don't have permission to use admin commands. This command requires one of these roles: " +
				Object.values(ADMIN_ROLES)
					.map((role) => `\`${role.name}\``)
					.join(", "),
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	return true;
}

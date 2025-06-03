/**
 * @fileoverview Discord ID resolution utilities
 * @description Provides helper functions for resolving Discord usernames to Discord IDs
 * @module sparta/discord/utils/discordIdResolver
 */

import { discordService } from "../services/discord-service";

/**
 * Interface for resolved Discord user information
 */
export interface ResolvedDiscordUser {
	discordId: string;
	discordUsername?: string;
}

/**
 * Resolves Discord user information for API calls
 * Prioritizes user ID over username but falls back gracefully
 * @param username Optional Discord username
 * @param userId Optional Discord user ID
 * @returns Promise<string | null> The Discord ID to use for API calls
 */
export async function resolveDiscordIdForApi(
	username?: string | null,
	userId?: string | null
): Promise<string | null> {
	// If we have a direct user ID, use it immediately
	if (userId) {
		return userId;
	}

	// If we have a username, try to resolve it to a Discord ID
	if (username) {
		const resolved = await discordService.fetchDiscordIdFromUsername(username);
		return resolved || null;
	}

	// No valid input provided
	return null;
} 
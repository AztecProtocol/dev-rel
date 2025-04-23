/**
 * @fileoverview Discord service for role management
 * @description Provides methods for managing Discord roles and finding users
 * @module sparta/services/discord-service
 */

import { discord } from "../clients/discord.js";
import { logger } from "@sparta/utils";
import { NodeOperatorRoles } from "../const.js";

/**
 * Discord service class for role management and user operations
 *
 * This service provides methods to:
 * - Assign roles to Discord users
 * - Find Discord users by username or tag
 * - Manage role hierarchies
 *
 * @example
 * // Get the service instance
 * const service = DiscordService.getInstance();
 *
 * // Assign a role to a user
 * await service.assignRole("1234567890", NodeOperatorRoles.Guardian);
 *
 * // Find a user by username
 * const userId = await service.findUserIdByUsername("username");
 */
export class DiscordService {
	private static instance: DiscordService;

	/**
	 * Gets the singleton instance of DiscordService
	 *
	 * @returns {DiscordService} The singleton instance
	 *
	 * @example
	 * const service = DiscordService.getInstance();
	 */
	public static getInstance(): DiscordService {
		if (!DiscordService.instance) {
			DiscordService.instance = new DiscordService();
		}
		return DiscordService.instance;
	}

	/**
	 * Assigns a role to a Discord user
	 *
	 * This method:
	 * 1. Finds the guild (Discord server)
	 * 2. Finds the role by name
	 * 3. Gets the member by their Discord ID
	 * 4. Removes any conflicting roles from the hierarchy
	 * 5. Assigns the new role
	 *
	 * @param {string} userId - The Discord user ID to assign the role to
	 * @param {string} roleName - The name of the role to assign
	 * @returns {Promise<boolean>} A promise that resolves to true if the role was assigned, false otherwise
	 *
	 * @example
	 * // Assign the Guardian role to a user
	 * const success = await discordService.assignRole("1234567890", NodeOperatorRoles.Guardian);
	 *
	 * if (success) {
	 *   logger.info("Role assigned successfully");
	 * } else {
	 *   logger.error("Failed to assign role");
	 * }
	 */
	public async assignRole(
		userId: string,
		roleName: string
	): Promise<boolean> {
		try {
			// Get the guild (server)
			const guildId = process.env.GUILD_ID;
			if (!guildId) {
				logger.error("GUILD_ID not set in environment variables");
				return false;
			}

			const guild = await discord.getGuild(guildId);
			if (!guild) {
				logger.error({ guildId }, "Guild not found");
				return false;
			}

			// Find the role
			const role = guild.roles.cache.find((r) => r.name === roleName);
			if (!role) {
				logger.error(
					{ roleName, guildName: guild.name },
					"Role not found in guild"
				);
				return false;
			}

			// Get the member
			const member = await guild.members.fetch(userId);
			if (!member) {
				logger.error(
					{ userId, guildName: guild.name },
					"Member not found in guild"
				);
				return false;
			}

			// First check and remove all hierarchy roles (regardless of target role)
			const rolesToRemove = member.roles.cache.filter((r) =>
				Object.values(NodeOperatorRoles).includes(
					r.name as NodeOperatorRoles
				)
			);

			if (rolesToRemove.size > 0) {
				logger.info(
					{
						roles: rolesToRemove.map((r) => r.name).join(", "),
						username: member.user.username,
					},
					"Removing existing roles"
				);
				try {
					await member.roles.remove(rolesToRemove);
					logger.debug(
						{
							count: rolesToRemove.size,
							username: member.user.username,
						},
						"Successfully removed roles"
					);
				} catch (error: any) {
					logger.error(
						{ error: error.message },
						"Error removing roles"
					);
					logger.error(
						"Bot might not have sufficient permissions or role hierarchy issue"
					);
				}

				// Refresh member data after removing roles
				try {
					await member.fetch();
					logger.debug(
						{
							roles: member.roles.cache
								.map((r) => r.name)
								.join(", "),
							username: member.user.username,
						},
						"Member data refreshed"
					);
				} catch (error: any) {
					logger.error(
						{ error: error.message },
						"Error refreshing member data"
					);
				}
			}

			// Now add the new role
			try {
				await member.roles.add(role);
				logger.info(
					{
						roleName,
						username: member.user.username,
					},
					"Successfully added role"
				);

				// Verify role was added
				const updatedMember = await guild.members.fetch(userId);
				const hasRole = updatedMember.roles.cache.has(role.id);
				await member.fetch();

				logger.debug(
					{
						username: member.user.username,
						roleName,
						hasRole,
					},
					"Role verification"
				);
			} catch (error: any) {
				logger.error({ error: error.message }, "Error adding role");
				logger.error(
					"Bot might not have sufficient permissions or role hierarchy issue"
				);
				return false;
			}

			return true;
		} catch (error) {
			logger.error({ error }, "Error assigning role");
			return false;
		}
	}

	/**
	 * Finds a Discord user by username or username#discriminator
	 *
	 * This method attempts to find a user through multiple strategies:
	 * 1. First checks the cache for the user
	 * 2. Tries using Discord's search functionality
	 * 3. Attempts a limited fetch of members
	 * 4. Tries a direct user lookup if the input looks like an ID
	 *
	 * @param {string} usernameOrTag - The Discord username (e.g., "username") or tag (e.g., "username#1234")
	 * @returns {Promise<string|null>} A promise that resolves to the user ID if found, null otherwise
	 *
	 * @example
	 * // Find a user by username
	 * const userId = await discordService.findUserIdByUsername("username");
	 *
	 * // Find a user by tag (legacy format)
	 * const userId = await discordService.findUserIdByUsername("username#1234");
	 *
	 * if (userId) {
	 *   logger.info(`Found user with ID: ${userId}`);
	 * } else {
	 *   logger.info("User not found");
	 * }
	 */
	public async findUserIdByUsername(
		usernameOrTag: string
	): Promise<string | null> {
		try {
			logger.debug({ username: usernameOrTag }, "Starting user lookup");

			// Get the guild (server)
			const guildId = process.env.GUILD_ID;
			if (!guildId) {
				logger.error("GUILD_ID not set in environment variables");
				return null;
			}

			const guild = await discord.getGuild(guildId);
			if (!guild) {
				logger.error({ guildId }, "Guild not found");
				return null;
			}

			logger.debug(
				{ guildName: guild.name, guildId: guild.id },
				"Guild found"
			);

			// Instead of loading all members at once, which can be slow and cause timeouts,
			// we'll use search functionality if available or limit the fetch

			// First try with currently cached members
			logger.debug("Checking cached members first");
			const cachedMember = this.findMemberInCache(guild, usernameOrTag);
			if (cachedMember) {
				logger.info(
					{
						username: cachedMember.user.username,
						userId: cachedMember.id,
					},
					"Found user in cache"
				);
				return cachedMember.id;
			}

			logger.debug("User not found in cache, attempting limited fetch");

			// Try different strategies to find the user
			let userId = null;

			// Strategy 1: Try search if available
			userId = await this.trySearchByUsername(guild, usernameOrTag);
			if (userId) return userId;

			// Strategy 2: Try limited fetch with timeout
			userId = await this.tryLimitedFetch(guild, usernameOrTag);
			if (userId) return userId;

			// Strategy 3: Try direct user lookup if it might be an ID already
			if (/^\d+$/.test(usernameOrTag)) {
				try {
					logger.debug(
						{ username: usernameOrTag },
						"Username looks like an ID, trying direct fetch"
					);
					const member = await guild.members
						.fetch(usernameOrTag)
						.catch(() => null);
					if (member) {
						logger.info(
							{
								username: member.user.username,
								userId: member.id,
							},
							"Found user directly"
						);
						return member.id;
					}
				} catch (error: any) {
					logger.debug(
						{ error: error.message },
						"Direct fetch failed"
					);
				}
			}

			logger.info(
				{ username: usernameOrTag },
				"Could not find user with username after trying all strategies"
			);
			return null;
		} catch (error) {
			logger.error({ error }, "Error finding user by username");
			return null;
		}
	}

	/**
	 * Attempts to search for a user by username using Discord's search feature
	 *
	 * @param {any} guild - The Discord guild object
	 * @param {string} username - The username to search for
	 * @returns {Promise<string|null>} A promise that resolves to the user ID if found, null otherwise
	 *
	 * @private
	 */
	private async trySearchByUsername(
		guild: any,
		username: string
	): Promise<string | null> {
		if (!guild.members.search) {
			logger.debug("Search capability not available");
			return null;
		}

		logger.debug({ username }, "Attempting to search for username");
		try {
			const searchResults = await guild.members.search({
				query: username,
				limit: 5,
			});

			if (searchResults && searchResults.size > 0) {
				const member = searchResults.first();
				if (member && member.user) {
					logger.info(
						{
							username: member.user.username,
							userId: member.id,
						},
						"Found user via search"
					);
					return member.id;
				}
			}
			logger.debug("Search returned no results");
			return null;
		} catch (searchError) {
			logger.error({ searchError }, "Error using member search");
			return null;
		}
	}

	/**
	 * Attempts to find a user by fetching a limited number of members
	 * Uses a timeout to prevent hanging
	 *
	 * This method:
	 * 1. First tries with a small batch (25 members) for speed
	 * 2. If unsuccessful, tries with a larger batch (100 members)
	 * 3. Uses an abort controller to prevent hanging
	 *
	 * @param {any} guild - The Discord guild object
	 * @param {string} username - The username to search for
	 * @returns {Promise<string|null>} A promise that resolves to the user ID if found, null otherwise
	 *
	 * @private
	 */
	private async tryLimitedFetch(
		guild: any,
		username: string
	): Promise<string | null> {
		logger.debug("Attempting limited fetch with timeout protection");
		try {
			// Create a controller to allow aborting the fetch
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				controller.abort();
				logger.debug("Fetch operation aborted due to timeout");
			}, 5000);

			// Try a smaller batch first (faster)
			try {
				logger.debug("Trying fetch with limit 25");
				const members = await guild.members.fetch({
					limit: 25,
					signal: controller.signal,
				});

				const match = this.findMatchingMember(members, username);
				if (match) {
					clearTimeout(timeoutId);
					return match;
				}
			} catch (error: any) {
				if (error.name === "AbortError") {
					logger.debug("First fetch attempt aborted");
				} else {
					logger.error(
						{ error: error.message },
						"Error in first fetch attempt"
					);
				}
			}

			// Try a larger batch if first attempt failed but not timed out
			if (!controller.signal.aborted) {
				try {
					logger.debug("Trying fetch with limit 100");
					const members = await guild.members.fetch({
						limit: 100,
						signal: controller.signal,
					});

					const match = this.findMatchingMember(members, username);
					if (match) {
						clearTimeout(timeoutId);
						return match;
					}
				} catch (error: any) {
					if (error.name === "AbortError") {
						logger.debug("Second fetch attempt aborted");
					} else {
						logger.error(
							{ error: error.message },
							"Error in second fetch attempt"
						);
					}
				}
			}

			clearTimeout(timeoutId);
			logger.debug(
				"Limited fetch attempts completed without finding user"
			);
			return null;
		} catch (error) {
			logger.error({ error }, "Error in limited fetch process");
			return null;
		}
	}

	/**
	 * Find a matching member from a collection of Discord members
	 *
	 * @param {any} members - Collection of Discord members
	 * @param {string} username - The username to find
	 * @returns {string|null} The user ID if found, null otherwise
	 *
	 * @private
	 */
	private findMatchingMember(members: any, username: string): string | null {
		if (!members || typeof members.forEach !== "function") {
			logger.debug("Invalid members data received");
			return null;
		}

		for (const [_, member] of members) {
			if (this.isUserMatch(member, username)) {
				logger.info(
					{
						username: member.user.username,
						userId: member.id,
					},
					"Found user"
				);
				return member.id;
			}
		}

		logger.debug(`No matching user found among ${members.size} members`);
		return null;
	}

	/**
	 * Checks if a Discord member matches the given username or tag
	 *
	 * Supports both modern username format and legacy username#discriminator format
	 *
	 * @param {any} member - The Discord member object
	 * @param {string} usernameOrTag - The username or tag to check against
	 * @returns {boolean} True if the member matches, false otherwise
	 *
	 * @private
	 */
	private isUserMatch(member: any, usernameOrTag: string): boolean {
		// Check if the input includes a discriminator (#)
		const isTag = usernameOrTag.includes("#");

		if (isTag) {
			// For legacy username#discriminator format
			const fullTag = `${member.user.username}#${member.user.discriminator}`;
			return fullTag === usernameOrTag;
		} else {
			// For regular username
			return member.user.username === usernameOrTag;
		}
	}

	/**
	 * Finds a Discord member in the currently cached members
	 *
	 * @param {any} guild - The Discord guild object
	 * @param {string} usernameOrTag - The username or tag to find
	 * @returns {any} The member object if found, undefined otherwise
	 *
	 * @private
	 */
	private findMemberInCache(guild: any, usernameOrTag: string): any {
		return guild.members.cache.find((member: any) =>
			this.isUserMatch(member, usernameOrTag)
		);
	}
}

// Export a default instance
export default DiscordService;

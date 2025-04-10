/**
 * @fileoverview Discord service for role management
 * @description Provides methods for managing Discord roles and finding users
 * @module sparta/services/discord-service
 */

import { discord } from "../clients/discord.js";

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
 * await service.assignRole("1234567890", "Guardian");
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
	 * // Assign the "Guardian" role to a user
	 * const success = await discordService.assignRole("1234567890", "Guardian");
	 *
	 * if (success) {
	 *   console.log("Role assigned successfully");
	 * } else {
	 *   console.error("Failed to assign role");
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
				console.error("GUILD_ID not set in environment variables");
				return false;
			}

			const guild = await discord.getGuild(guildId);
			if (!guild) {
				console.error(`Guild with ID ${guildId} not found`);
				return false;
			}

			// Find the role
			const role = guild.roles.cache.find((r) => r.name === roleName);
			if (!role) {
				console.error(
					`Role "${roleName}" not found in guild ${guild.name}`
				);
				return false;
			}

			// Get the member
			const member = await guild.members.fetch(userId);
			if (!member) {
				console.error(
					`Member with ID ${userId} not found in guild ${guild.name}`
				);
				return false;
			}

			// Define the hierarchy roles
			const hierarchyRoles = ["Guardian", "Defender", "Sentinel"];

			// First check and remove all hierarchy roles (regardless of target role)
			const rolesToRemove = member.roles.cache.filter((r) =>
				hierarchyRoles.includes(r.name)
			);

			if (rolesToRemove.size > 0) {
				console.log(
					`Removing existing roles: ${rolesToRemove
						.map((r) => r.name)
						.join(", ")}`
				);
				try {
					await member.roles.remove(rolesToRemove);
					console.log(
						`Successfully removed ${rolesToRemove.size} roles from ${member.user.username}`
					);
				} catch (error: any) {
					console.error(`ERROR removing roles: ${error.message}`);
					console.error(
						`Bot might not have sufficient permissions or role hierarchy issue`
					);
				}

				// Refresh member data after removing roles
				try {
					await member.fetch();
					console.log(
						`Member data refreshed. Current roles: ${member.roles.cache
							.map((r) => r.name)
							.join(", ")}`
					);
				} catch (error: any) {
					console.error(
						`ERROR refreshing member data: ${error.message}`
					);
				}
			}

			// Now add the new role
			try {
				await member.roles.add(role);
				console.log(
					`Successfully added role "${roleName}" to user ${member.user.username}`
				);

				// Verify role was added
				const updatedMember = await guild.members.fetch(userId);
				const hasRole = updatedMember.roles.cache.has(role.id);
				await member.fetch();

				console.log(
					`Verification - User ${member.user.username} has role "${roleName}": ${hasRole}`
				);
			} catch (error: any) {
				console.error(`ERROR adding role: ${error.message}`);
				console.error(
					`Bot might not have sufficient permissions or role hierarchy issue`
				);
				return false;
			}

			return true;
		} catch (error) {
			console.error("Error assigning role:", error);
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
	 *   console.log(`Found user with ID: ${userId}`);
	 * } else {
	 *   console.log("User not found");
	 * }
	 */
	public async findUserIdByUsername(
		usernameOrTag: string
	): Promise<string | null> {
		try {
			console.log(`Starting lookup for user: ${usernameOrTag}`);

			// Get the guild (server)
			const guildId = process.env.GUILD_ID;
			if (!guildId) {
				console.error("GUILD_ID not set in environment variables");
				return null;
			}

			const guild = await discord.getGuild(guildId);
			if (!guild) {
				console.error(`Guild with ID ${guildId} not found`);
				return null;
			}

			console.log(`Guild found: ${guild.name} (${guild.id})`);

			// Instead of loading all members at once, which can be slow and cause timeouts,
			// we'll use search functionality if available or limit the fetch

			// First try with currently cached members
			console.log("Checking cached members first...");
			const cachedMember = this.findMemberInCache(guild, usernameOrTag);
			if (cachedMember) {
				console.log(
					`Found user in cache: ${cachedMember.user.username} (${cachedMember.id})`
				);
				return cachedMember.id;
			}

			console.log("User not found in cache, attempting limited fetch...");

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
					console.log(
						`Username looks like an ID, trying direct fetch: ${usernameOrTag}`
					);
					const member = await guild.members
						.fetch(usernameOrTag)
						.catch(() => null);
					if (member) {
						console.log(
							`Found user directly: ${member.user.username} (${member.id})`
						);
						return member.id;
					}
				} catch (error: any) {
					console.log(`Direct fetch failed: ${error.message}`);
				}
			}

			console.log(
				`Could not find user with username: ${usernameOrTag} after trying all strategies`
			);
			return null;
		} catch (error) {
			console.error("Error finding user by username:", error);
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
			console.log("Search capability not available");
			return null;
		}

		console.log(`Attempting to search for username: ${username}`);
		try {
			const searchResults = await guild.members.search({
				query: username,
				limit: 5,
			});

			if (searchResults && searchResults.size > 0) {
				const member = searchResults.first();
				if (member && member.user) {
					console.log(
						`Found user via search: ${member.user.username} (${member.id})`
					);
					return member.id;
				}
			}
			console.log("Search returned no results");
			return null;
		} catch (searchError) {
			console.error("Error using member search:", searchError);
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
		console.log("Attempting limited fetch with timeout protection...");
		try {
			// Create a controller to allow aborting the fetch
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				controller.abort();
				console.log("Fetch operation aborted due to timeout");
			}, 5000);

			// Try a smaller batch first (faster)
			try {
				console.log("Trying fetch with limit 25...");
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
					console.log("First fetch attempt aborted");
				} else {
					console.error("Error in first fetch attempt:", error);
				}
			}

			// Try a larger batch if first attempt failed but not timed out
			if (!controller.signal.aborted) {
				try {
					console.log("Trying fetch with limit 100...");
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
						console.log("Second fetch attempt aborted");
					} else {
						console.error("Error in second fetch attempt:", error);
					}
				}
			}

			clearTimeout(timeoutId);
			console.log(
				"Limited fetch attempts completed without finding user"
			);
			return null;
		} catch (error) {
			console.error("Error in limited fetch process:", error);
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
			console.log("Invalid members data received");
			return null;
		}

		for (const [_, member] of members) {
			if (this.isUserMatch(member, username)) {
				console.log(
					`Found user: ${member.user.username} (${member.id})`
				);
				return member.id;
			}
		}

		console.log(`No matching user found among ${members.size} members`);
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
export const discordService = DiscordService.getInstance();

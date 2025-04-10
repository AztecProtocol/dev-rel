/**
 * @fileoverview Discord service for role management
 * @description Provides methods for managing Discord roles
 * @module sparta/services/discord-service
 */

import { discord } from "../clients/discord.js";

/**
 * Discord service for role management and other Discord-related functionality
 */
export class DiscordService {
	private static instance: DiscordService;

	/**
	 * Gets the singleton instance of DiscordService
	 */
	public static getInstance(): DiscordService {
		if (!DiscordService.instance) {
			DiscordService.instance = new DiscordService();
		}
		return DiscordService.instance;
	}

	/**
	 * Assigns a role to a user
	 * @param userId The Discord user ID
	 * @param roleName The name of the role to assign
	 * @returns A promise that resolves to true if the role was assigned, false otherwise
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

			// Remove any existing hierarchy roles from the user
			const rolesToRemove = member.roles.cache.filter(
				(r) => hierarchyRoles.includes(r.name) && r.name !== roleName
			);

			if (rolesToRemove.size > 0) {
				console.log(
					`Removing existing roles: ${rolesToRemove
						.map((r) => r.name)
						.join(", ")}`
				);
				await member.roles.remove(rolesToRemove);
			}

			// Assign the new role if they don't already have it
			if (!member.roles.cache.has(role.id)) {
				await member.roles.add(role);
				console.log(
					`Assigned role "${roleName}" to user ${member.user.username} (replaced previous roles)`
				);
			} else {
				console.log(
					`User ${member.user.username} already has role "${roleName}"`
				);
			}

			return true;
		} catch (error) {
			console.error("Error assigning role:", error);
			return false;
		}
	}

	/**
	 * Finds a user by username or username#discriminator in a guild
	 * @param usernameOrTag The Discord username (e.g., "username" or "username#1234")
	 * @returns A promise that resolves to the user ID if found, null otherwise
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
	 * Find a matching member from a collection of members
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
	 * Checks if a member matches the given username or tag
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
	 * Finds a member in the currently cached members
	 */
	private findMemberInCache(guild: any, usernameOrTag: string): any {
		return guild.members.cache.find((member: any) =>
			this.isUserMatch(member, usernameOrTag)
		);
	}
}

// Export a default instance
export const discordService = DiscordService.getInstance();

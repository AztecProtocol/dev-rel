/**
 * @fileoverview Discord service for role management
 * @description Provides methods for managing Discord roles and finding users
 * @module sparta/discord/services
 */

import { getDiscordInstance } from "../clients/discord";
import { logger } from "@sparta/utils";
import { type Guild, type GuildMember, type Role as DiscordRole, type TextChannel } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import type { ApiProvider } from "@sparta/utils/openapi/api/apiProvider";
import type { Client as ApiClient } from "@sparta/utils/openapi/types";
import type { Role } from "@sparta/utils/const/roles";

/**
 * Discord service class for role management and user operations
 *
 * This service provides methods to:
 * - Assign roles to Discord users
 * - Find Discord users by username or tag
 * - Manage role hierarchies
 * - Send direct messages to users
 */
export class DiscordService {
	private static instance: DiscordService;
	private apiProvider: ApiProvider | null = null;
	private apiClient: ApiClient | null = null;

	private constructor() {
		// Private constructor for singleton pattern
	}

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
	 * Initialize the service with API provider
	 */
	public async init(): Promise<void> {
		if (this.apiClient) return; // Already initialized

		try {
			const discord = await getDiscordInstance();
			this.apiProvider = discord.getApiProvider();
			this.apiClient = this.apiProvider.getClient();
			logger.info("Discord service initialized with API client");
		} catch (error) {
			logger.error({ error }, "Failed to initialize Discord service");
			throw error;
		}
	}

	/**
	 * Shutdown the Discord client and clean up resources
	 * This prevents unhandled promise rejections when the Lambda function exits
	 */
	public async shutdown(): Promise<void> {
		try {
			// Get the Discord instance
			const discord = await getDiscordInstance();
			const client = discord.getClient();
			
			// Destroy the client connection
			if (client) {
				logger.debug("Destroying Discord client connection");
				await client.destroy();
			}
			
			// Clear the singleton instance
			DiscordService.instance = null as any;
			this.apiProvider = null;
			this.apiClient = null;
			
			logger.debug("Discord client resources released");
		} catch (error) {
			logger.error({ error }, "Error shutting down Discord client");
		}
	}

	/**
	 * Validates that a role can be assigned to a user
	 */
	public async validateRoleAssignment(
		userId: string,
		roleName: string
	): Promise<{
		isValid: boolean;
		message: string;
		guild?: Guild;
		role?: DiscordRole;
		member?: GuildMember;
	}> {
		try {
			// Get the guild (server)
			const guildId = process.env.GUILD_ID;
			if (!guildId) {
				return {
					isValid: false,
					message: "GUILD_ID not set in environment variables",
				};
			}

			// Get the instance
			const discord = await getDiscordInstance();
			const guild = await discord.getGuild(guildId);
			if (!guild) {
				return {
					isValid: false,
					message: `Guild not found with ID: ${guildId}`,
				};
			}

			// Find the role
			const role: DiscordRole | undefined = guild.roles.cache.find(
				(r) => r.name === roleName
			);
			if (!role) {
				return {
					isValid: false,
					message: `Role '${roleName}' not found in guild '${guild.name}'`,
				};
			}

			// Get the member
			try {
				if (!userId) {
					return {
						isValid: false,
						message: "Missing userId for role assignment",
					};
				}

				const member = await guild.members.fetch(userId);
				if (!member) {
					return {
						isValid: false,
						message: `User with ID '${userId}' not found in guild '${guild.name}'`,
					};
				}

				return {
					isValid: true,
					message: "Validation successful",
					guild,
					role,
					member,
				};
			} catch (memberError) {
				return {
					isValid: false,
					message: `User with ID '${userId}' not found in guild '${guild.name}'`,
				};
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return {
				isValid: false,
				message: `Validation error: ${errorMessage}`,
			};
		}
	}

	public async assignRoles(userId: string, roles: Role[]): Promise<boolean> {
		for (const role of roles) {
			await this.assignRole(userId, role.name);
		}
		return true;
	}

	/**
	 * Assigns a role to a Discord user
	 * @param userId The Discord user ID
	 * @param roleName The name of the role to assign
	 */
	public async assignRole(
		userId: string,
		roleName: string
	): Promise<boolean> {
		// Ensure API client is initialized
		if (!this.apiClient) {
			await this.init();
			if (!this.apiClient) {
				logger.error("API client not initialized");
				return false;
			}
		}

		const validationResult = await this.validateRoleAssignment(
			userId,
			roleName
		);

		if (!validationResult.isValid) {
			logger.error(
				{ userId, roleName, error: validationResult.message },
				"Role assignment validation failed"
			);
			return false;
		}

		const { member, role } = validationResult;
		await member!.roles.add(role!);
		logger.info({ userId, roleName }, "Role assigned successfully");

		return true;
	}

	/**
	 * Edits the reply to an interaction using the interaction token
	 */
	public async editInteractionReply(
		interactionToken: string,
		content: any
	): Promise<boolean> {
		if (!interactionToken) {
			logger.error("No interaction token provided for edit");
			return false;
		}

		try {
			const rest = new REST({ version: "10" }).setToken(
				process.env.BOT_TOKEN as string
			);

			await rest.patch(
				Routes.webhookMessage(
					process.env.BOT_CLIENT_ID as string,
					interactionToken
				),
				{ body: content }
			);
			return true;
		} catch (error) {
			logger.error(
				{
					error,
					interactionToken: interactionToken.substring(0, 10) + "...",
				},
				"Error updating interaction reply"
			);
			return false;
		}
	}

	/**
	 * Fetches a Discord username from a Discord user ID
	 * @param userId The Discord user ID
	 * @returns Promise<string | null> The username or null if not found
	 */
	public async fetchUsernameFromDiscordId(userId: string): Promise<string | null> {
		try {
			// Validate userId parameter
			if (!userId) {
				logger.error("Cannot fetch username - userId is null, undefined, or empty");
				return null;
			}

			// Ensure API client is initialized
			if (!this.apiClient) {
				await this.init();
				if (!this.apiClient) {
					logger.error("API client not initialized");
					return null;
				}
			}

			const discord = await getDiscordInstance();
			const client = discord.getClient();

			try {
				// Get the user
				const user = await client.users.fetch(userId);
				if (!user) {
					logger.error({ userId }, "Failed to find Discord user");
					return null;
				}

				logger.info({ userId, username: user.username }, "Successfully fetched Discord username");
				return user.username;
			} catch (error) {
				logger.error({ error, userId }, "Error fetching Discord user");
				return null;
			}
		} catch (error) {
			logger.error({ error, userId }, "Error in fetchUsernameFromDiscordId method");
			return null;
		}
	}

	/**
	 * Fetches a Discord user ID from a Discord username
	 * @param username The Discord username (without discriminator)
	 * @returns Promise<string | null> The user ID or null if not found
	 */
	public async fetchDiscordIdFromUsername(username: string): Promise<string | null> {
		try {
			// Validate username parameter
			if (!username) {
				logger.error("Cannot fetch Discord ID - username is null, undefined, or empty");
				return null;
			}

			// Ensure API client is initialized
			if (!this.apiClient) {
				await this.init();
				if (!this.apiClient) {
					logger.error("API client not initialized");
					return null;
				}
			}

			const discord = await getDiscordInstance();
			const guild = await discord.getGuild(process.env.GUILD_ID as string);

			try {
				// Use Discord.js built-in query functionality to search for members by username
				// This is much more efficient than fetching all members
				const members = await guild.members.fetch({ 
					query: username, 
					limit: 1 
				});

				if (members.size === 0) {
					logger.warn({ username }, "No Discord user found with this username in the guild");
					return null;
				}

				// Get the first (and should be only) member from the search results
				const foundMember = members.first();
				if (!foundMember) {
					logger.warn({ username }, "No Discord user found with this username in the guild");
					return null;
				}

				logger.info({ username, userId: foundMember.user.id }, "Successfully found Discord ID from username");
				return foundMember.user.id;
			} catch (error) {
				logger.error({ error, username }, "Error fetching Discord ID from username");
				return null;
			}
		} catch (error) {
			logger.error({ error, username }, "Error in fetchDiscordIdFromUsername method");
			return null;
		}
	}

	/**
	 * Sends a direct message to a Discord user
	 * @param userId The Discord user ID
	 * @param message The message content to send
	 * @returns Promise<boolean> indicating success or failure
	 */
	public async sendDirectMessage(
		userId: string,
		message: string
	): Promise<boolean> {
		try {
			// Validate userId parameter
			if (!userId) {
				logger.error(
					"Cannot send direct message - userId is null, undefined, or empty"
				);
				return false;
			}

			// Ensure API client is initialized
			if (!this.apiClient) {
				await this.init();
				if (!this.apiClient) {
					logger.error("API client not initialized");
					return false;
				}
			}

			const discord = await getDiscordInstance();
			const client = discord.getClient();

			try {
				// Get the user
				const user = await client.users.fetch(userId);
				if (!user) {
					logger.error(
						{ userId },
						"Failed to find Discord user for direct message"
					);
					return false;
				}

				// Send DM
				await user.send(message);
				logger.info(
					{ userId, messageLength: message.length },
					"Direct message sent successfully"
				);
				return true;
			} catch (error) {
				logger.error(
					{ error, userId },
					"Error sending direct message to Discord user"
				);
				return false;
			}
		} catch (error) {
			logger.error(
				{ error, userId },
				"Error in sendDirectMessage method"
			);
			return false;
		}
	}

	/**
	 * Sends a message to a Discord channel
	 * @param channelId The Discord channel ID
	 * @param message The message content to send
	 * @returns Promise<boolean> indicating success or failure
	 */
	public async sendChannelMessage(
		channelId: string,
		message: string
	): Promise<boolean> {
		try {
			// Ensure API client is initialized
			if (!this.apiClient) {
				await this.init();
				if (!this.apiClient) {
					logger.error("API client not initialized");
					return false;
				}
			}

			const discord = await getDiscordInstance();
			const client = discord.getClient();

			try {
				// Get the guild 
				const guildId = process.env.GUILD_ID;
				if (!guildId) {
					logger.error("GUILD_ID not set in environment variables");
					return false;
				}

				const guild = await client.guilds.fetch(guildId);
				if (!guild) {
					logger.error(
						{ guildId },
						"Failed to find Discord guild"
					);
					return false;
				}

				// Get the channel from the guild
				const channel = await guild.channels.fetch(channelId) as TextChannel;
				if (!channel || !channel.isTextBased()) {
					logger.error(
						{ channelId },
						"Failed to find Discord text channel for message"
					);
					return false;
				}

				// Send channel message
				await channel.send(message);
				logger.info(
					{ channelId, messageLength: message.length },
					"Channel message sent successfully"
				);
				return true;
			} catch (error) {
				logger.error(
					{ error, channelId },
					"Error sending message to Discord channel"
				);
				return false;
			}
		} catch (error) {
			logger.error(
				{ error, channelId },
				"Error in sendChannelMessage method"
			);
			return false;
		}
	}
}

// Export a singleton instance
export const discordService = DiscordService.getInstance();

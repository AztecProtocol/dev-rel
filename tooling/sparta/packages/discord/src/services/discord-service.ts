/**
 * @fileoverview Discord service for role management
 * @description Provides methods for managing Discord roles and finding users
 * @module sparta/discord/services
 */

import { getDiscordInstance } from "../clients/discord";
import { logger } from "@sparta/utils";
import { PassportRoles } from "../types";
import type { Guild, GuildMember, Role as DiscordRole } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import type { ApiProvider } from "../api/apiProvider";
import type { Client as ApiClient } from "@sparta/utils/openapi/types";
import type { Role } from "@sparta/utils/const/roles";

/**
 * Discord service class for role management and user operations
 *
 * This service provides methods to:
 * - Assign roles to Discord users
 * - Find Discord users by username or tag
 * - Manage role hierarchies
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

		// Update user role in API
		try {
			await this.apiClient.updateUser(
				{ discordUserId: userId },
				{ role: roleName }
			);
		} catch (apiError) {
			logger.error(
				{ error: apiError, userId, roleName },
				"Failed to update user role in API"
			);
			// Continue since Discord role was already assigned
		}

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
}

// Export a singleton instance
export const discordService = DiscordService.getInstance();

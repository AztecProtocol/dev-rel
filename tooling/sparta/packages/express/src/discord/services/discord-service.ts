/**
 * @fileoverview Discord service for role management
 * @description Provides methods for managing Discord roles and finding users
 * @module sparta/services/discord-service
 */

// Assuming this path is correct relative to the built structure or linked packages
import { discord } from "../clients/discord.js"; 
import { logger } from "@sparta/utils";
// Import constants from the central utils package
import {
  // NodeOperatorRoles, // Unused
  PassportRoles,
  MINIMUM_SCORE,
  HIGH_SCORE_THRESHOLD,
} from "@sparta/utils/const.js";
// Import necessary types from discord.js
import type { Guild, Role, GuildMember } from 'discord.js';

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
	 * Validates that a role can be assigned to a user
	 * 
	 * This method checks if:
	 * 1. The guild exists
	 * 2. The role exists in the guild
	 * 3. The user exists in the guild
	 * 
	 * @param {string} userId - The Discord user ID to validate
	 * @param {string} roleName - The name of the role to validate
	 * @returns {Promise<{isValid: boolean, message: string, guild?: any, role?: any, member?: any}>} 
	 *          Validation result with error message if invalid
	 */
	public async validateRoleAssignment(
		userId: string,
		roleName: string
	// Use specific Discord.js types if possible, otherwise keep 'any' for now if structure is complex/unknown
	): Promise<{isValid: boolean, message: string, guild?: Guild | any, role?: Role | any, member?: GuildMember | any}> {
		try {
			// Get the guild (server)
			const guildId = process.env.GUILD_ID;
			if (!guildId) {
				return {
					isValid: false,
					message: "GUILD_ID not set in environment variables"
				};
			}

			const guild = await discord.getGuild(guildId);
			if (!guild) {
				return {
					isValid: false,
					message: `Guild not found with ID: ${guildId}`
				};
			}

			// Find the role - Add type for 'r'
			const role = guild.roles.cache.find((r: Role) => r.name === roleName);
			if (!role) {
				return {
					isValid: false,
					message: `Role '${roleName}' not found in guild '${guild.name}'`
				};
			}

			// Get the member
			try {
				if (!userId) {
					return {
						isValid: false,
						message: "Missing userId for role assignment"
					};
				}
				
				const member = await guild.members.fetch(userId);
				if (!member) {
					return {
						isValid: false,
						message: `User with ID '${userId}' not found in guild '${guild.name}'`
					};
				}
				
				return {
					isValid: true,
					message: "Validation successful",
					guild,
					role,
					member
				};
			} catch (memberError) {
				return {
					isValid: false,
					message: `User with ID '${userId}' not found in guild '${guild.name}'`
				};
			}
		} catch (error) {
			// Type the caught error
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				isValid: false,
				message: `Validation error: ${errorMessage}`
			};
		}
	}

	/**
	 * Assigns a role to a Discord user
	 * 
	 * @param {string} userId - The Discord user ID
	 * @param {string} roleName - The name of the role to assign
	 * @returns {Promise<boolean>} A promise that resolves to true if the role was assigned
	 */
	public async assignRole(userId: string, roleName: string): Promise<boolean>;
	
	/**
	 * Assigns a role to a Discord user using pre-validated data
	 * 
	 * This is an optimized version of assignRole that skips the validation steps
	 * if the data has already been validated.
	 * 
	 * @param {object} validatedData - The validated data from validateRoleAssignment
	 * @returns {Promise<boolean>} A promise that resolves to true if the role was assigned
	 */
	public async assignRole(
		// Use specific types if possible
		validatedData: {member: GuildMember | any, role: Role | any}
	): Promise<boolean>;
	
	/**
	 * Assigns a role based on user score
	 * 
	 * Determines the appropriate role (Verified or High Scorer) based on the score
	 * and assigns it.
	 * 
	 * @param {string} userId - The Discord user ID
	 * @param {number} score - The user's passport score
	 * @returns {Promise<boolean>} A promise that resolves to true if the role was assigned
	 */
	public async assignRole(userId: string, score: number): Promise<boolean>;
	
	public async assignRole(
		arg1: string | {member: GuildMember | any, role: Role | any}, 
		arg2?: string | number // Accept string (roleName) or number (score)
	): Promise<boolean> {
		try {
			// Check if this is the userId + score version
			if (typeof arg1 === 'string' && typeof arg2 === 'number') {
				const userId = arg1;
				const score = arg2;

				if (score < MINIMUM_SCORE) {
					logger.info(
						{ userId, score, minimum: MINIMUM_SCORE },
						"User score below minimum, no role assigned."
					);
					return true; // Indicate success as no action was needed
				}

				// Always assign the base Verified role first
				logger.info(
					{ userId, score, roleName: PassportRoles.Verified },
					"Assigning base verified role..."
				);
				const verifiedRoleAssigned = await this.assignRole(userId, PassportRoles.Verified);

				if (!verifiedRoleAssigned) {
					logger.error({ userId, roleName: PassportRoles.Verified }, "Failed to assign base verified role.");
					return false; // Failed to assign the essential role
				}
				
				// Additionally assign High Scorer role if threshold is met
				if (score >= HIGH_SCORE_THRESHOLD) { 
					logger.info(
						{ userId, score, threshold: HIGH_SCORE_THRESHOLD, roleName: PassportRoles.HighScorer },
						"Score meets threshold, assigning high scorer role..."
					);
					const highScorerRoleAssigned = await this.assignRole(userId, PassportRoles.HighScorer);
					if (!highScorerRoleAssigned) {
						// Log the error but don't necessarily fail the whole operation, 
						// as the base role was assigned. Consider if this should return false.
						logger.error({ userId, roleName: PassportRoles.HighScorer }, "Failed to assign high scorer role.");
						// Depending on requirements, you might want to return false here
						// return false;
					}
				}

				return true; // Indicate overall success (at least base role assigned)

			}
			// Check if this is the userId + roleName version
			else if (typeof arg1 === 'string' && typeof arg2 === 'string') {
				const userId = arg1;
				const roleName = arg2;
				
				// Validate the role assignment
				const validation = await this.validateRoleAssignment(userId, roleName);
				if (!validation.isValid) {
					logger.error({ userId, roleName, error: validation.message }, "Role assignment validation failed");
					return false;
				}
				
				// Use the validated data
				return this.assignRole({
					member: validation.member,
					role: validation.role
				});
			}
			// Check if this is the pre-validated data version
			else if (typeof arg1 === 'object' && arg1 !== null && 'member' in arg1 && 'role' in arg1) {
				const { member, role } = arg1 as {member: GuildMember | any, role: Role | any};
				
				await member.roles.add(role);
				logger.info(
					{
						roleName: role.name,
						username: member.user.username,
					},
					"Successfully added role with pre-validated data"
				);
				
				return true;
			} else {
				// Handle invalid arguments case
				logger.error({ arg1, arg2 }, "Invalid arguments passed to assignRole");
				return false;
			}

		} catch (error) {
			// Type the caught error
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error({ error: errorMessage }, "Error assigning role");
			return false;
		}
	}
}

// Export a default instance
export default DiscordService;

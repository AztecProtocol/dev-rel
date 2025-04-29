/**
 * @fileoverview Discord service for role management
 * @description Provides methods for managing Discord roles and finding users
 * @module sparta/services/discord-service
 */

// Assuming this path is correct relative to the built structure or linked packages
// import { discord } from "../clients/discord.js"; // Removed direct import
import { getDiscordInstance } from "../clients/discord.js"; // Import the getter
import { logger } from "@sparta/utils";
// Import constants from the central utils package
import {
	// NodeOperatorRoles, // Unused
	PassportRoles,
} from "@sparta/utils/const.js";
// Import necessary types from discord.js
import type { Guild, Role, GuildMember } from "discord.js";
// Import REST and Routes for editing interactions
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

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
	): Promise<{
		isValid: boolean;
		message: string;
		guild?: Guild | any;
		role?: Role | any;
		member?: GuildMember | any;
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

			// Find the role - Add type for 'r'
			const role = guild.roles.cache.find(
				(r: Role) => r.name === roleName
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
			// Type the caught error
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return {
				isValid: false,
				message: `Validation error: ${errorMessage}`,
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
		validatedData: { member: GuildMember | any; role: Role | any }
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
		arg1: string | { member: GuildMember | any; role: Role | any },
		arg2?: string | number // Accept string (roleName) or number (score)
	): Promise<boolean> {
		try {
			// Check if this is the userId + score version
			if (typeof arg1 === "string" && typeof arg2 === "number") {
				const userId = arg1;
				const score = arg2;
				const minimumScore = parseInt(process.env.MINIMUM_SCORE || "0");

				const validationResult = await this.validateRoleAssignment(
					userId,
					PassportRoles.Verified // Use Verified role for validation context
				);

				if (!validationResult.isValid || !validationResult.member) {
					logger.error(
						{
							userId,
							score,
							error: validationResult.message,
						},
						"Validation failed before score-based role assignment/removal."
					);
					return false;
				}

				const { member, guild } = validationResult;
				const verifiedRole = guild.roles.cache.find(
					(r: Role) => r.name === PassportRoles.Verified
				);

				if (!verifiedRole) {
					logger.error(
						{
							userId,
							roleName: PassportRoles.Verified,
							guildId: guild.id,
						},
						"Verified role not found in guild during score-based assignment."
					);
					return false;
				}

				if (score < minimumScore) {
					logger.info(
						{
							userId,
							score,
							minimum: minimumScore,
						},
						"Score below minimum, attempting to remove verified role (if present)"
					);
					try {
						if (member.roles.cache.has(verifiedRole.id)) {
							await member.roles.remove(verifiedRole);
							logger.info(
								{ userId, roleName: verifiedRole.name },
								"Successfully removed role due to low score."
							);
						} else {
							logger.info(
								{
									userId,
									roleName: verifiedRole.name,
								},
								"User did not have the role, no removal needed."
							);
						}
						return true; // Indicate success (removal attempted/not needed)
					} catch (removeError: any) {
						logger.error(
							{
								error: removeError.message,
								userId,
								roleName: verifiedRole.name,
							},
							"Error removing role due to low score."
						);
						return false;
					}
				} else {
					// Score is sufficient, assign Verified role
					logger.info(
						{
							userId,
							score,
							minimum: minimumScore,
							roleName: PassportRoles.Verified,
						},
						"Score sufficient, attempting to assign base verified role..."
					);
					try {
						if (!member.roles.cache.has(verifiedRole.id)) {
							await member.roles.add(verifiedRole);
							logger.info(
								{ userId, roleName: verifiedRole.name },
								"Successfully assigned verified role."
							);
						} else {
							logger.info(
								{
									userId,
									roleName: verifiedRole.name,
								},
								"User already has the verified role."
							);
						}
						return true; // Indicate success
					} catch (addError: any) {
						logger.error(
							{
								error: addError.message,
								userId,
								roleName: verifiedRole.name,
							},
							"Error assigning verified role."
						);
						return false;
					}
				}
			}
			// Check if this is the userId + roleName version
			else if (typeof arg1 === "string" && typeof arg2 === "string") {
				const userId = arg1;
				const roleName = arg2;

				// Validate the role assignment
				const validation = await this.validateRoleAssignment(
					userId,
					roleName
				);
				if (!validation.isValid) {
					logger.error(
						{ userId, roleName, error: validation.message },
						"Role assignment validation failed"
					);
					return false;
				}

				// Use the validated data
				return this.assignRole({
					member: validation.member,
					role: validation.role,
				});
			}
			// Check if this is the pre-validated data version
			else if (
				typeof arg1 === "object" &&
				arg1 !== null &&
				"member" in arg1 &&
				"role" in arg1
			) {
				const { member, role } = arg1 as {
					member: GuildMember | any;
					role: Role | any;
				};

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
				logger.error(
					{ arg1, arg2 },
					"Invalid arguments passed to assignRole"
				);
				return false;
			}
		} catch (error) {
			// Type the caught error
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error({ error: errorMessage }, "Error assigning role");
			return false;
		}
	}

	/**
	 * Edits the original interaction reply message.
	 *
	 * @param interactionToken The token of the original interaction.
	 * @param content The new content for the message (can include embeds, components).
	 * @returns {Promise<boolean>} True if the edit was successful, false otherwise.
	 */
	public async editInteractionReply(
		interactionToken: string,
		content: any
	): Promise<boolean> {
		const rest = new REST({ version: "10" }).setToken(
			process.env.BOT_TOKEN!
		); // Ensure BOT_TOKEN is set
		const clientId = process.env.BOT_CLIENT_ID;

		if (!clientId) {
			logger.error(
				"BOT_CLIENT_ID environment variable is not set. Cannot edit interaction reply."
			);
			return false;
		}

		try {
			logger.info(
				{ interactionToken },
				"Attempting to edit interaction reply."
			);
			await rest.patch(
				Routes.webhookMessage(clientId, interactionToken),
				{ body: content } // content should be an object like { embeds: [], components: [] }
			);
			logger.info(
				{ interactionToken },
				"Successfully edited interaction reply."
			);
			return true;
		} catch (error: any) {
			logger.error(
				{ error: error.message, interactionToken },
				"Failed to edit interaction reply"
			);
			// Common errors: Unknown interaction (token expired/invalid), Missing Permissions
			return false;
		}
	}
}

// Export a default instance
export default DiscordService;

import { logger } from "@sparta/utils/logger";
import { DiscordService } from "../services/discord-service.js";
import type { Role } from "@sparta/utils/const/roles.js";

/**
 * Attempts to assign Discord roles based on score.
 * Returns true if successful, false otherwise (logs errors).
 */
export async function _handleNodeOperatorRoleAssignment(
	discordUserId: string,
	role: Role
): Promise<boolean> {
	const discordService = DiscordService.getInstance(); // Get instance

	logger.info(
		{ userId: discordUserId },
		"Attempting immediate role assignment..."
	);
	try {
		// Ensure the discord service is initialized
		await discordService.init();

		const success = await discordService.assignRole(
			discordUserId,
			role.name
		);
		if (success) {
			logger.info(
				{ userId: discordUserId, role: role.name },
				"Node operator role assignment successful."
			);
		} else {
			logger.error(
				{ userId: discordUserId, role: role.name },
				"Node operator role assignment failed (discordService returned false)."
			);
		}
		return success;
	} catch (error: any) {
		logger.error(
			{ error: error.message, userId: discordUserId },
			"Error during role assignment."
		);
		return false;
	}
}

/**
 * Attempts to assign Discord roles based on score.
 * Returns true if successful, false otherwise (logs errors).
 */
export async function _handleUserRolesAssignment(
	sessionId: string,
	discordUserId: string,
	roles: Role[]
): Promise<boolean> {
	logger.info(
		{ sessionId, userId: discordUserId, roles },
		"Attempting immediate role assignment..."
	);

	const discordService = DiscordService.getInstance(); // Get instance

	try {
		// Ensure the discord service is initialized
		await discordService.init();

		const success = await discordService.assignRoles(discordUserId, roles);
		if (success) {
			logger.info(
				{ sessionId, userId: discordUserId, roles },
				"Role assignment successful."
			);
		} else {
			logger.error(
				{ sessionId, userId: discordUserId, roles },
				"Role assignment failed (discordService returned false)."
			);
		}
		return success;
	} catch (error: any) {
		logger.error(
			{ error: error.message, sessionId, userId: discordUserId },
			"Error during role assignment."
		);
		return false;
	}
}

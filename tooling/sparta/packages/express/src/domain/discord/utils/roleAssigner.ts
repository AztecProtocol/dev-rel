import { logger } from "@sparta/utils/logger";
import { DiscordService } from "../services/discord-service";

const discordService = DiscordService.getInstance(); // Get instance

/**
 * Attempts to assign Discord roles based on score.
 * Returns true if successful, false otherwise (logs errors).
 */
export async function _handleRoleAssignment(sessionId: string, discordUserId: string, score: number): Promise<boolean> {
	logger.info({ sessionId, userId: discordUserId, score }, "Attempting immediate role assignment...");
	try {
		const success = await discordService.assignRole(discordUserId, score);
		if (success) {
			logger.info({ sessionId, userId: discordUserId, score }, "Role assignment successful.");
		} else {
			logger.error({ sessionId, userId: discordUserId, score }, "Role assignment failed (discordService returned false).");
		}
		return success;
	} catch (error: any) {
		logger.error({ error: error.message, sessionId, userId: discordUserId }, "Error during role assignment.");
		return false;
	}
}

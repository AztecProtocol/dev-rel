/**
 * @fileoverview Channel definitions for Discord communication
 * @description Provides channel constants for communicating with Discord
 * @module sparta/utils/const/channels
 */

/**
 * Interface for channel definition
 */
export interface Channel {
	name: string;
	id: string;
}

/**
 * Channel definitions used throughout the application
 */
export const CHANNELS = {
	MOD_BOT: { name: "mod-bot", id: "1367117045963161685" },
	BOT_TEST: { name: "bot-test", id: "1329081299490570296" },
	OPERATORS_START_HERE: { name: "operators | start-here", id: "1367196595866828982" },
};

/**
 * Get allowed channels based on environment
 * @returns Array of channel IDs allowed in the current environment
 */
export function getAllowedChannelIds(): string[] {
	const environment = process.env.NODE_ENV || "development";
	
	return environment === "production"
		? [CHANNELS.MOD_BOT.id, CHANNELS.BOT_TEST.id]
		: [CHANNELS.BOT_TEST.id];
}

/**
 * Gets a string describing the allowed channels based on the current environment
 * @returns A formatted string of allowed channel names
 */
export function getAllowedChannelsText(): string {
	const environment = process.env.NODE_ENV || "development";
	return environment === "production"
		? `#${CHANNELS.MOD_BOT.name} or #${CHANNELS.BOT_TEST.name}`
		: `#${CHANNELS.BOT_TEST.name}`;
} 
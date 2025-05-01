/**
 * @fileoverview Channel restriction utilities
 * @description Provides utilities for checking channel-based restrictions
 * @module sparta/discord/utils/channels
 */

import { TextChannel } from "discord.js";

/**
 * Channel definitions for command restrictions
 */
export const CHANNELS = {
	MOD_BOT: { name: "mod-bot", id: "1367117045963161685" },
	BOT_TEST: { name: "bot-test", id: "1329081299490570296" },
	OPERATORS_START_HERE: { name: "operators | start-here", id: "1367196595866828982" },
};

/**
 * Checks if the channel is allowed for moderator commands based on environment
 * @param channel The channel to check
 * @returns True if the channel is allowed, false otherwise
 */
export function isAllowedChannel(channel: TextChannel): boolean {
	const environment = process.env.NODE_ENV || "development";

	if (environment === "production") {
		// In production, allow commands in both mod-bot and bot-test channels
		return [CHANNELS.MOD_BOT.id, CHANNELS.BOT_TEST.id].includes(channel.id);
	} else {
		// In development or other environments, only allow in bot-test
		return channel.id === CHANNELS.BOT_TEST.id;
	}
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

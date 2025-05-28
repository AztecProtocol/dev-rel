/**
 * @fileoverview Message management utilities
 * @description Provides utilities for managing Discord messages including automatic cleanup
 * @module sparta/discord/utils/messageManager
 */

import { ChatInputCommandInteraction, ButtonInteraction, Message } from "discord.js";
import { logger } from "@sparta/utils";

// Store the last message ID per channel and command type to allow cleanup
const lastMessageIds = new Map<string, string>();

/**
 * Generates a unique key for tracking messages based on channel and command type
 * @param channelId The Discord channel ID
 * @param commandType The type of command (e.g., 'help', 'chain-info')
 * @returns A unique key for tracking this message type in this channel
 */
function getMessageKey(channelId: string, commandType: string): string {
	return `${channelId}:${commandType}`;
}

/**
 * Cleans up the previous message of the same type in a channel and stores the new message ID
 * This prevents channel clutter by ensuring only one message of each type exists per channel
 * 
 * @param interaction The Discord interaction (either ChatInputCommandInteraction or ButtonInteraction)
 * @param commandType The type of command (e.g., 'help', 'chain-info')
 * @param newMessage The new message that was just created
 * @returns Promise that resolves when cleanup is complete
 */
export async function manageChannelMessage(
	interaction: ChatInputCommandInteraction | ButtonInteraction,
	commandType: string,
	newMessage: Message | any
): Promise<void> {
	try {
		const channelId = interaction.channelId;
		const messageKey = getMessageKey(channelId, commandType);

		// Delete the previous message if it exists
		if (lastMessageIds.has(messageKey)) {
			const previousMessageId = lastMessageIds.get(messageKey);
			if (previousMessageId && interaction.channel) {
				try {
					const previousMessage = await interaction.channel.messages.fetch(previousMessageId);
					if (previousMessage && previousMessage.deletable) {
						await previousMessage.delete();
						logger.debug(`Deleted previous ${commandType} message ${previousMessageId} in channel ${channelId}`);
					}
				} catch (deleteError) {
					// Message might already be deleted or not found, that's fine
					logger.debug(`Could not delete previous ${commandType} message: ${deleteError}`);
				}
			}
		}

		// Store the new message ID for future cleanup
		if (typeof newMessage === 'object' && 'id' in newMessage) {
			lastMessageIds.set(messageKey, newMessage.id);
			logger.debug(`Stored ${commandType} message ID ${newMessage.id} for channel ${channelId}`);
		}
	} catch (error) {
		logger.error(`Error managing channel message for ${commandType}:`, error);
		// Don't throw - this is a cleanup utility and shouldn't break the main functionality
	}
}

/**
 * Convenience function that combines message cleanup and sending a new message
 * This should be called after sending your message to handle cleanup automatically
 * 
 * @param interaction The Discord interaction
 * @param commandType The type of command (e.g., 'help', 'chain-info') 
 * @param messagePromise A promise that resolves to the message that was sent
 * @returns Promise that resolves when cleanup is complete
 */
export async function sendAndManageMessage(
	interaction: ChatInputCommandInteraction | ButtonInteraction,
	commandType: string,
	messagePromise: Promise<Message | any>
): Promise<void> {
	try {
		const message = await messagePromise;
		await manageChannelMessage(interaction, commandType, message);
	} catch (error) {
		logger.error(`Error in sendAndManageMessage for ${commandType}:`, error);
		// Don't throw - this is a cleanup utility
	}
}

/**
 * Clears all stored message IDs (useful for testing or memory cleanup)
 */
export function clearMessageCache(): void {
	lastMessageIds.clear();
	logger.debug("Cleared message management cache");
} 
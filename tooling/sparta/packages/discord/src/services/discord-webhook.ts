/**
 * @fileoverview Lightweight Discord webhook service
 * @description Provides methods for sending Discord messages via webhooks without initializing the full client
 * @module sparta/discord/services
 */

import { logger } from "@sparta/utils";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

/**
 * Lightweight service for sending Discord messages via REST API
 * Designed for serverless environments like AWS Lambda
 */
export class DiscordWebhookService {
  private static instance: DiscordWebhookService;
  private botToken: string;
  private clientId: string;
  private rest: REST;

  /**
   * Initialize with bot token and client ID
   */
  private constructor() {
    this.botToken = process.env.BOT_TOKEN || "";
    this.clientId = process.env.BOT_CLIENT_ID || "";
    this.rest = new REST({ version: "10" }).setToken(this.botToken);
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DiscordWebhookService {
    if (!DiscordWebhookService.instance) {
      DiscordWebhookService.instance = new DiscordWebhookService();
    }
    return DiscordWebhookService.instance;
  }

  /**
   * Send a direct message to a user via the REST API
   * @param userId Discord user ID
   * @param content Message content
   */
  public async sendDirectMessage(userId: string, content: string): Promise<boolean> {
    try {
      if (!userId || !content) {
        logger.warn("Missing userId or content for direct message");
        return false;
      }

      if (!this.botToken || !this.clientId) {
        logger.error("Missing BOT_TOKEN or BOT_CLIENT_ID environment variables");
        return false;
      }

      // Create a DM channel first
      const dmChannelData = await this.rest.post(
        Routes.userChannels(),
        {
          body: {
            recipient_id: userId
          }
        }
      ) as { id: string };

      // Get the DM channel ID
      const channelId = dmChannelData.id;
      if (!channelId) {
        logger.error(`Failed to create DM channel for user ${userId}`);
        return false;
      }

      // Send message to the DM channel
      await this.rest.post(
        Routes.channelMessages(channelId),
        {
          body: {
            content
          }
        }
      );

      logger.info(`Direct message sent to user ${userId}`);
      return true;
    } catch (error) {
      logger.error({ error }, `Failed to send direct message to user ${userId}`);
      return false;
    }
  }

  /**
   * Send a message to a channel via the REST API
   * @param channelId Discord channel ID
   * @param content Message content
   */
  public async sendChannelMessage(channelId: string, content: string): Promise<boolean> {
    try {
      if (!channelId || !content) {
        logger.warn("Missing channelId or content for channel message");
        return false;
      }

      if (!this.botToken) {
        logger.error("Missing BOT_TOKEN environment variable");
        return false;
      }

      // Send message to the channel
      await this.rest.post(
        Routes.channelMessages(channelId),
        {
          body: {
            content
          }
        }
      );

      logger.info(`Channel message sent to channel ${channelId}`);
      return true;
    } catch (error) {
      logger.error({ error }, `Failed to send channel message to channel ${channelId}`);
      return false;
    }
  }

  /**
   * Creates a private thread in a specified parent channel, invites a user, and sends an initial message.
   * @param options - Options for creating the private thread.
   * @returns An object indicating success, and including threadId if successful, or an error message.
   */
  public async createPrivateThreadWithInitialMessage(options: {
    parentChannelId: string;
    userToInviteAndMention: string;
    threadName: string;
    initialMessage: string;
    autoArchiveDurationMinutes: number;
    reason?: string;
  }): Promise<{ success: boolean; threadId?: string; error?: string }> {
    const { 
      parentChannelId, 
      userToInviteAndMention, 
      threadName, 
      initialMessage, 
      autoArchiveDurationMinutes, 
      reason 
    } = options;

    try {
      if (!parentChannelId || !userToInviteAndMention || !threadName || !initialMessage) {
        logger.warn("Missing required parameters for creating a private thread");
        return { success: false, error: "Missing required parameters" };
      }

      // Create the private thread
      // Note: Type 12 is GUILD_PRIVATE_THREAD. For public, use 11 (GUILD_PUBLIC_THREAD).
      // For private threads, the bot must have CREATE_PRIVATE_THREADS permission.
      // The initial message to the thread is created separately after thread creation if not supported directly.
      const thread = await this.rest.post(
        Routes.threads(parentChannelId),
        {
          body: {
            name: threadName,
            auto_archive_duration: autoArchiveDurationMinutes,
            type: 12, // GUILD_PRIVATE_THREAD
            invitable: false, // Only users with MANAGE_THREADS can invite others (true allows anyone)
            reason: reason || "Creating private thread for notification",
          },
        }
      ) as { id: string; owner_id: string }; // Adjust type based on actual API response

      if (!thread || !thread.id) {
        logger.error("Failed to create private thread.");
        return { success: false, error: "Failed to create private thread" };
      }

      logger.info(`Private thread created with ID: ${thread.id} in channel ${parentChannelId}`);

      // Add the user to the thread
      // The bot needs MANAGE_THREADS or be the thread creator and have SEND_MESSAGES in the thread
      await this.rest.put(
        Routes.threadMembers(thread.id, userToInviteAndMention)
        // No body needed to add a user, just their ID in the route
      );
      logger.info(`User ${userToInviteAndMention} added to thread ${thread.id}`);

      // Send the initial message to the thread, mentioning the user
      const messageWithMention = `<@${userToInviteAndMention}> ${initialMessage}`;
      await this.rest.post(
        Routes.channelMessages(thread.id),
        {
          body: {
            content: messageWithMention,
          },
        }
      );
      logger.info(`Initial message sent to thread ${thread.id}`);

      return { success: true, threadId: thread.id };

    } catch (error: any) {
      logger.error({ error }, `Failed to create private thread or send message for user ${userToInviteAndMention}`);
      // Attempt to provide a more specific error message if available from Discord's API response
      const discordError = error?.rawError?.message || error?.message || "Unknown error during thread creation/messaging";
      return { success: false, error: discordError };
    }
  }
}

// Export a singleton instance
export const discordWebhookService = DiscordWebhookService.getInstance(); 
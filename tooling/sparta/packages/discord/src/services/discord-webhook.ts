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
   * Send a message to a user (simplified version of private thread)
   * @param options - Options for sending the message
   * @returns An object indicating success or failure
   */
  public async sendMessageToUser(options: {
    userId: string;
    message: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { userId, message } = options;

    try {
      if (!userId || !message) {
        logger.warn("Missing required parameters for sending message to user");
        return { success: false, error: "Missing required parameters" };
      }

      const result = await this.sendDirectMessage(userId, message);
      
      if (result) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to send direct message" };
      }

    } catch (error: any) {
      logger.error({ error }, `Failed to send message to user ${userId}`);
      const discordError = error?.rawError?.message || error?.message || "Unknown error during message sending";
      return { success: false, error: discordError };
    }
  }
}

// Export a singleton instance
export const discordWebhookService = DiscordWebhookService.getInstance(); 
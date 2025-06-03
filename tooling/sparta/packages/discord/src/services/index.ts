/**
 * @fileoverview Service module exports
 * @description Centralizes exports for all Sparta Discord service modules
 * @module sparta/discord/services
 */

import { DiscordService, discordService } from "./discord-service.js";

/**
 * Export all service classes and instances
 *
 * - DiscordService: Manages Discord roles and user interactions
 * - discordService: Singleton instance of DiscordService
 */
export { DiscordService, discordService };

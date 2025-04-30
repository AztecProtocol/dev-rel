/**
 * @fileoverview Service module exports
 * @description Centralizes exports for all Sparta Discord service modules
 * @module sparta/discord/services
 */

import { ChainInfoService, chainInfoService } from "./l1-info-service.js";
import { DiscordService, discordService } from "./discord-service.js";

/**
 * Export all service classes and instances
 *
 * - ChainInfoService: Retrieves blockchain state information via API
 * - DiscordService: Manages Discord roles and user interactions
 * - discordService: Singleton instance of DiscordService
 * - chainInfoService: Singleton instance of ChainInfoService
 */
export { ChainInfoService, chainInfoService, DiscordService, discordService };

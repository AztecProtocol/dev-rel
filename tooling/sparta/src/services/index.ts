/**
 * @fileoverview Service module exports
 * @description Centralizes exports for all Sparta service modules
 * @module sparta/services
 */

import { GoogleSheetService } from "./googlesheet-service.js";
import { ChainInfoService } from "./chaininfo-service.js";
import { ValidatorService } from "./validator-service.js";
import { DiscordService, discordService } from "./discord-service.js";

/**
 * Export all service classes and instances
 *
 * - GoogleSheetService: Monitors Google Sheets and assigns roles based on scores
 * - ChainInfoService: Retrieves blockchain state information
 * - ValidatorService: Manages Ethereum validators
 * - DiscordService: Manages Discord roles and user interactions
 * - discordService: Singleton instance of DiscordService
 */
export {
	GoogleSheetService,
	ChainInfoService,
	ValidatorService,
	DiscordService,
	discordService,
};

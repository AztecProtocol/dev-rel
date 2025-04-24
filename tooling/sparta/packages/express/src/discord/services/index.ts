/**
 * @fileoverview Service module exports
 * @description Centralizes exports for all Sparta service modules
 * @module sparta/services
 */

import { ChainInfoService } from "./chaininfo-service.js";
// import { ValidatorService } from "./validator-service"; // File not found
import { DiscordService } from "./discord-service.js";

// Initialize service instances
const discordService = DiscordService.getInstance();

/**
 * Export all service classes and instances
 *
 * - GoogleSheetService: Monitors Google Sheets and assigns roles based on scores
 * - ChainInfoService: Retrieves blockchain state information
 * - DiscordService: Manages Discord roles and user interactions
 * - discordService: Singleton instance of DiscordService
 */
export {
	ChainInfoService,
	// ValidatorService, // Commented out due to missing file
	DiscordService,
	discordService,
};

/**
 * @fileoverview Service module exports
 * @description Centralizes exports for all Sparta service modules
 * @module sparta/services
 */

import { ChainInfoService } from "./chaininfo-service.js";
import { ValidatorService } from "./validator-service.js";
import { DiscordService } from "./discord-service.js";
import { PassportService, PassportRoles } from "./passport-service.js";

// Initialize service instances
const discordService = DiscordService.getInstance();
const passportService = PassportService.getInstance(discordService);

/**
 * Export all service classes and instances
 *
 * - GoogleSheetService: Monitors Google Sheets and assigns roles based on scores
 * - ChainInfoService: Retrieves blockchain state information
 * - ValidatorService: Manages Ethereum validators
 * - DiscordService: Manages Discord roles and user interactions
 * - discordService: Singleton instance of DiscordService
 * - PassportService: Integrates with Human Passport for score verification
 * - PassportRoles: Role constants for Passport verification
 * - passportService: Singleton instance of PassportService
 */
export {
	ChainInfoService,
	ValidatorService,
	DiscordService,
	discordService,
	PassportService,
	PassportRoles,
	passportService,
};

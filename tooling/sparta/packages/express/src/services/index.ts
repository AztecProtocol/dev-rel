/**
 * @fileoverview Service module exports
 * @description Centralizes exports for all services in the Express API
 * @module sparta/express/services
 */

import { PassportService } from "./passport-service.js";
import { DiscordService } from "./discord-service.js";

// Initialize service instances
const passportService = PassportService.getInstance();
const discordService = DiscordService.getInstance();

/**
 * Export all service classes and instances
 * 
 * - PassportService: Handles Human Passport verification
 * - DiscordService: Handles Discord role management
 * - passportService: Singleton instance of PassportService
 * - discordService: Singleton instance of DiscordService
 */
export {
    PassportService,
    DiscordService,
    passportService,
    discordService
}; 

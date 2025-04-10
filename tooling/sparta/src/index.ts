/**
 * @fileoverview Main entry point for the Sparta Discord bot
 * @description Initializes the Ethereum client and Discord bot services
 * @module sparta/index
 */

import {
	ChainInfoService,
	ValidatorService,
	GoogleSheetService,
} from "./services/index.js";
import "./clients/discord.js"; // Import to ensure Discord client is initialized

// Initialize services
export const chainInfoService = new ChainInfoService();
export const validatorService = new ValidatorService();
export const googleSheetService = new GoogleSheetService();

// Start services
console.log("Starting services...");
googleSheetService.watchColumn("Sheet1", "A:B");

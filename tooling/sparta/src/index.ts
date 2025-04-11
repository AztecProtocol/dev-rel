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
import { logger } from "./utils/logger.js";

// Log application startup
logger.info("Sparta bot starting up");

// Initialize services
logger.debug("Initializing services");
export const chainInfoService = new ChainInfoService();
export const validatorService = new ValidatorService();
export const googleSheetService = new GoogleSheetService();

// Start services
logger.info("Starting services...");
googleSheetService.watchColumn("Sheet1", "A:B");

// Log configuration
logger.debug(
	{
		logLevel: process.env.LOG_LEVEL || "info",
		prettyPrint: process.env.LOG_PRETTY_PRINT !== "false",
		environment: process.env.NODE_ENV || "development",
	},
	"Current configuration"
);

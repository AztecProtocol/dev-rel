/**
 * @fileoverview Main entry point for the Sparta Discord bot
 * @description Initializes the Ethereum client and Discord bot services
 * @module sparta/index
 */

import { ChainInfoService, ValidatorService } from "./services/index.js";
import "./clients/discord.js"; // Import to ensure Discord client is initialized
import { logger } from "@sparta/utils";
import { startBotApiServer } from "./api-server.js"; // Import the API server start function

// Log application startup
logger.info("Sparta bot starting up");

// Initialize services
logger.debug("Initializing services");
export const chainInfoService = new ChainInfoService();
export const validatorService = new ValidatorService();

// Start services
logger.info("Starting services...");

// Log configuration
logger.debug(
	{
		logLevel: process.env.LOG_LEVEL || "info",
		prettyPrint: process.env.LOG_PRETTY_PRINT !== "false",
		environment: process.env.NODE_ENV || "development",
	},
	"Current configuration"
);

// Start the internal API server
startBotApiServer();

// Remove or keep the commented out block below as desired
/*
logger.info("Starting API server for gitcoin passport verification...");
import("./api/index.js")
	.then((apiModule) => {
		logger.info(
			`API server started on port ${process.env.API_PORT || 3000}`
		);
	})
	.catch((error) => {
		logger.error({ error: error.message }, "Failed to start API server");
	});
*/

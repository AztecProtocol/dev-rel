/**
 * @fileoverview Authentication middleware
 * @description Middleware functions for authentication and authorization
 * @module sparta/express/middlewares/auth-middleware
 */

import { type Request, type Response, type NextFunction } from "express";
import { logger } from "@sparta/utils/index.js";

/**
 * API key middleware for authenticating API requests
 * Validates the x-api-key header against the configured API key
 */
export const apiKeyMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const apiKey = req.headers["x-api-key"];
	const configuredApiKey = process.env.BACKEND_API_KEY;

	if (!configuredApiKey) {
		logger.error("BACKEND_API_KEY environment variable is not set");
		return res.status(500).json({
			success: false,
			error: "Server configuration error: API key not configured",
		});
	}

	if (!apiKey || apiKey !== configuredApiKey) {
		return res.status(401).json({
			success: false,
			error: "Unauthorized: Invalid or missing API key",
		});
	}

	next();
	return;
};

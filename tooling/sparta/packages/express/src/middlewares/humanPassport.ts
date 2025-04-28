/**
 * @fileoverview Middleware for verification routes
 * @description Middleware functions for verification-related routes
 * @module sparta/express/middlewares/verification-middleware
 */

import { type Request, type Response, type NextFunction } from "express";
import { logger } from "@sparta/utils/index.js";
import { extendedDynamoDB } from "../db/userRepository.js";
import type { User } from "../routes/users.js";

/**
 * Middleware to validate a verification token/ID
 * Used to check if a user exists and is in the verification process
 */
export const validateVerification = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Get verificationId from route params, query, or body
		const verificationId = req.params.verificationId || req.query.verificationId || req.body.verificationId;
		
		if (!verificationId) {
			return res.status(400).json({
				success: false,
				error: "Missing verificationId parameter",
			});
		}

		console.log(`Validating verification with ID: ${verificationId}`);

		const user = await extendedDynamoDB.getUserByVerificationId(verificationId);
		
		if (!user) {
			console.log(`User with verification ID not found: ${verificationId}`);
			return res.status(404).json({
				success: false,
				error: "Verification not found or expired",
			});
		}

		// Check for humanPassport data
		if (!user.humanPassport) {
			console.log(`User found but no humanPassport data: ${verificationId}`);
			return res.status(404).json({
				success: false,
				error: "No active verification found for this ID",
			});
		}

		console.log(`Verification found: ${JSON.stringify(user)}`);
		
		// Attach user to request object for use in route handlers
		req.user = user;
		req.verificationId = verificationId as string;
		next();
	} catch (error: any) {
		logger.error(
			{ error: error.message, path: req.path },
			"Error in verification validation middleware"
		);

		return res.status(500).json({
			success: false,
			error: "Server error",
		});
	}
};

// Define user property in Express Request
declare global {
	namespace Express {
		interface Request {
			user?: User;
			verificationId?: string;
		}
	}
} 

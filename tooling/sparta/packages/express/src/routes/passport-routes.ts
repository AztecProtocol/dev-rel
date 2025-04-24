/**
 * @fileoverview API routes for Human Passport verification (within Discord Bot)
 * @description Express routes for handling wallet verification with Human Passport
 * @module sparta/express/routes/passport-routes
 */

import express, { type Request, type Response, NextFunction } from "express";
import { PassportService } from "../services/passport-service.js";
import { logger, inMemoryDB } from "@sparta/utils/index.js";
import { randomUUID } from "crypto";
import { recoverMessageAddress } from "viem";

const router = express.Router();
const passportService = PassportService.getInstance();

// Standard verification message for wallet signature
// This is just for wallet ownership verification, not for the Passport API (v2 doesn't need a signed message)
const VERIFICATION_MESSAGE = "Verify wallet ownership for Aztec Discord";

// Removed duplicate CORS middleware - it's already applied at the app level
router.use(express.json());

/**
 * Middleware to validate a session
 * Used to check if a session exists and is valid
 */
const validateSession = (req: Request, res: Response, next: NextFunction) => {
	try {
		// Get sessionId from route params, query, or body
		const sessionId = req.params.sessionId || req.query.sessionId || req.body.sessionId;
		
		if (!sessionId) {
			return res.status(400).json({
				success: false,
				error: "Missing sessionId parameter",
			});
		}

		console.log(`Validating session with ID: ${sessionId}`);

		const session = inMemoryDB.getSession(sessionId as string);
		
		if (!session) {
			console.log(`Session not found: ${sessionId}`);
			return res.status(404).json({
				success: false,
				error: "Session not found or expired",
			});
		}

		console.log(`Session found: ${JSON.stringify(session)}`);
		
		// Attach session to request object for use in route handlers
		req.session = session;
		// Also attach the sessionId
		req.session.id = sessionId as string;
		next();
	} catch (error: any) {
		logger.error(
			{ error: error.message, path: req.path },
			"Error in session validation middleware"
		);

		return res.status(500).json({
			success: false,
			error: "Server error",
		});
	}
};

/**
 * Route to validate a session
 * Used to check if a session exists and is valid
 */
router.get("/session/:sessionId", validateSession, (req: Request, res: Response) => {
	// Return session information (without sensitive data)
	return res.status(200).json({
		success: true,
		sessionValid: true,
		sessionId: req.session.id,
		walletConnected: !!req.session.walletAddress,
		walletAddress: req.session.walletAddress,
		verified: req.session.verified,
		status: req.session.status,
		score: req.session.score,
		lastScoreTimestamp: req.session.lastScoreTimestamp
	});
});

router.post("/create-session", (req: Request, res: Response) => {
	try {
		const { userId } = req.body;

		if (!userId) {
			return res.status(400).json({
				success: false,
				error: "Missing userId parameter",
			});
		}

		// Generate a unique session ID
		const sessionId = randomUUID();

		// Create a verification session
		const sessionCreated = inMemoryDB.createSession(sessionId, userId);

		if (!sessionCreated) {
			// Handle potential session ID collision or other creation error
			logger.error({ userId }, "Failed to create verification session.");
			return res.status(500).json({
				success: false,
				error: "Failed to create verification session (ID collision). Please try again.",
			});
		}

		// Return the session ID to the client
		return res.status(200).json({
			success: true,
			sessionId,
			verificationUrl: `${process.env.WEBAPP_HOST}:${process.env.WEBAPP_PORT}/passport?session=${sessionId}`,
		});
	} catch (error: any) {
		logger.error({ error: error.message, path: req.path }, "Error in create session route");
		return res.status(500).json({
			success: false,
			error: "Server error during session creation",
		});
	}
});

/**
 * Route to verify a signature and process Passport verification
 */
router.post("/verify", async (req: Request, res: Response) => {
	try {
		const { signature } = req.body;
		// Get sessionId from either query params or body
		const sessionId = req.query.sessionId || req.body.sessionId;

		if (!signature) {
			return res.status(400).json({
				success: false,
				error: "Missing signature parameter",
			});
		}
		
		if (!sessionId) {
			return res.status(400).json({
				success: false,
				error: "Missing sessionId parameter",
			});
		}

		console.log(`Verifying signature for session: ${sessionId}`);
		
		// Get the session
		const session = inMemoryDB.getSession(sessionId as string);
		if (!session) {
			return res.status(404).json({
				success: false,
				error: "Session not found or expired",
			});
		}
		
		// Recover the address from the signature
		try {
			const recoveredAddress = await recoverMessageAddress({
				message: VERIFICATION_MESSAGE,
				signature,
			});
			
			console.log(`Recovered address: ${recoveredAddress}`);
			
			// Update session with wallet address (this is where we first set it)
			inMemoryDB.updateWalletAddress(sessionId as string, recoveredAddress);
			console.log(`Set wallet address: ${recoveredAddress} for session: ${sessionId}`);
			
			// Process the verification
			const result = await passportService.processVerification(
				sessionId as string,
				signature
			);

			// Return the result
			return res.status(200).json({
				success: true,
				verified: result,
				address: recoveredAddress,
			});
		} catch (verificationError: any) {
			logger.error(
				{ error: verificationError.message },
				"Error recovering address from signature"
			);
			
			return res.status(400).json({
				success: false,
				error: "Invalid signature",
			});
		}
	} catch (error: any) {
		logger.error(
			{ error: error.message, path: req.path },
			"Error in verify signature route"
		);

		return res.status(500).json({
			success: false,
			error: "Server error",
		});
	}
});

/**
 * Route to check the verification status by Discord user ID
 */
router.get("/status/discord/:discordUserId", (req: Request, res: Response) => {
	try {
		const { discordUserId } = req.params;
		
		// Find the session by Discord user ID
		const session = inMemoryDB.findSessionByDiscordId(discordUserId);

		if (!session) {
			return res.status(404).json({
				success: false,
				error: "Session not found or expired",
			});
		}

		// Return the status info
		return res.status(200).json({
			success: true,
			walletConnected: !!session.walletAddress,
			signatureReceived: !!session.signature,
			verified: session.verified,
			roleAssigned: session.roleAssigned,
			score: session.score,
			minimumRequiredScore: passportService.getMinimumScore(),
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message, path: req.path },
			"Error in status check by Discord ID route"
		);

		return res.status(500).json({
			success: false,
			error: "Server error during status check",
		});
	}
});

/**
 * Route to create a test session for development/testing
 * Creates a dummy session and redirects to the verification page
 */
router.get("/test-session", (req: Request, res: Response) => {
	try {
		// Generate a unique session ID
		const sessionId = randomUUID();
		
		// Create a test user ID
		const testUserId = `test-user-${Date.now()}`;
		
		// Create a verification session
		const sessionCreated = inMemoryDB.createSession(sessionId, testUserId);
		
		if (!sessionCreated) {
			logger.error({ testUserId }, "Failed to create test verification session.");
			return res.status(500).json({
				success: false,
				error: "Failed to create test verification session. Please try again.",
			});
		}
		
		// Redirect to the verification page
		const verificationUrl = `${process.env.WEBAPP_HOST}:${process.env.WEBAPP_PORT}/passport?session=${sessionId}`;
		
		// Log the creation for debugging
		console.log(`Created test session: ${sessionId} for user ${testUserId}`);
		console.log(`Redirecting to: ${verificationUrl}`);
		
		return res.redirect(verificationUrl);
	} catch (error: any) {
		logger.error({ error: error.message }, "Error creating test session");
		return res.status(500).json({
			success: false,
			error: "Server error during test session creation",
		});
	}
});

/**
 * Route to manually set wallet address for a session (for troubleshooting)
 */
router.post("/set-wallet-address", (req: Request, res: Response) => {
	try {
		const { address } = req.body;
		// Get sessionId from either query params or body
		const sessionId = req.query.sessionId || req.body.sessionId;
		
		if (!address) {
			return res.status(400).json({
				success: false,
				error: "Missing address parameter",
			});
		}
		
		if (!sessionId) {
			return res.status(400).json({
				success: false,
				error: "Missing sessionId parameter",
			});
		}
		
		console.log(`Setting wallet address: ${address} for session: ${sessionId}`);
		
		// Get the session
		const session = inMemoryDB.getSession(sessionId as string);
		if (!session) {
			return res.status(404).json({
				success: false,
				error: "Session not found or expired",
			});
		}
		
		// Update the session
		const updated = inMemoryDB.updateWalletAddress(sessionId as string, address);
		
		if (!updated) {
			return res.status(500).json({
				success: false,
				error: "Failed to update wallet address",
			});
		}
		
		// Get the updated session
		const updatedSession = inMemoryDB.getSession(sessionId as string);
		
		return res.status(200).json({
			success: true,
			message: "Wallet address set successfully",
			sessionId,
			address,
			session: updatedSession
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message, path: req.path },
			"Error setting wallet address"
		);
		
		return res.status(500).json({
			success: false,
			error: "Server error",
		});
	}
});

// Add TypeScript declaration for the session property on the Request interface
declare global {
	namespace Express {
		interface Request {
			session: any;
		}
	}
}

export default router; 

/**
 * @fileoverview API routes for Human Passport verification (within Discord Bot)
 * @description Express routes for handling wallet verification with Human Passport
 * @module sparta/express/routes/passport-routes
 */

import express, { type Request, type Response, NextFunction } from "express";
import { PassportService } from "../services/passport-service.js";
import { logger, dynamoDB } from "@sparta/utils/index.js";
import { randomUUID } from "crypto";
import { recoverMessageAddress } from "viem";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { Session } from "@sparta/utils/dynamo-db"; // Corrected Session import
import DiscordService from "../discord/services/discord-service.js"; // Import DiscordService
import { MINIMUM_SCORE, HIGH_SCORE_THRESHOLD, STATUS_SCORE_RETRIEVED, STATUS_VERIFIED_COMPLETE, STATUS_VERIFICATION_FAILED_SCORE, STATUS_VERIFICATION_ERROR, STATUS_SESSION_USED, STATUS_WALLET_CONNECTED, STATUS_SIGNATURE_RECEIVED } from "@sparta/utils/const.js"; // Import status constants

const WEBAPP_URL = `${process.env.WEBAPP_HOST}:${process.env.WEBAPP_PORT}` || `http://localhost:5173`;
// Augment Express Request type to include session property
declare global {
	namespace Express {
		interface Request {
			session?: Session & { id?: string }; // Add session property
		}
	}
}

const router = express.Router();
const passportService = PassportService.getInstance();
const discordService = DiscordService.getInstance(); // Get instance

// Standard verification message for wallet signature
// This is just for wallet ownership verification, not for the Passport API (v2 doesn't need a signed message)
const VERIFICATION_MESSAGE = "Verify wallet ownership for Aztec Discord";

// Removed duplicate CORS middleware - it's already applied at the app level
router.use(express.json());

/**
 * Middleware to validate a session
 * Used to check if a session exists and is valid
 */
const validateSession = async (req: Request, res: Response, next: NextFunction) => {
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

		const session = await dynamoDB.getSession(sessionId as string);
		
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
 * @swagger
 * /session/{sessionId}:
 *   get:
 *     summary: Validate a session
 *     description: Check if a session exists and is valid
 *     tags: [Session]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         schema:
 *           type: string
 *         required: true
 *         description: The session ID
 *     responses:
 *       200:
 *         description: Session is valid
 *       400:
 *         description: Bad request - missing sessionId
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.get("/session/:sessionId", validateSession, (req: Request, res: Response) => {
	// Return session information (without sensitive data)
	return res.status(200).json({
		success: true,
		sessionValid: true,
		sessionId: req.session!.id,
		walletConnected: !!req.session!.walletAddress,
		walletAddress: req.session!.walletAddress,
		verified: req.session!.verified,
		status: req.session!.status,
		score: req.session!.score,
		lastScoreTimestamp: req.session!.lastScoreTimestamp
	});
});

/**
 * @swagger
 * /create-session:
 *   post:
 *     summary: Create a new verification session
 *     description: Create a new session for wallet verification
 *     tags: [Session]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Discord user ID
 *     responses:
 *       200:
 *         description: Session created successfully
 *       400:
 *         description: Bad request - missing userId
 *       500:
 *         description: Server error
 */
router.post("/create-session", async (req: Request, res: Response) => {
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

		// Create a verification session in DynamoDB - Pass separate args
		const sessionCreated = await dynamoDB.createSession(sessionId, userId);

		if (!sessionCreated) {
			// Handle potential session ID collision or other creation error
			logger.error({ userId }, "Failed to create verification session.");
			return res.status(500).json({
				success: false,
				error: "Failed to create verification session (ID collision). Please try again.",
			});
		}

		// Construct the verification URL
        const verificationUrl = `${WEBAPP_URL}/verify?sessionId=${sessionId}`;

		// Return the session ID and URL to the Discord bot command handler
		return res.status(200).json({
			success: true,
			sessionId,
			verificationUrl: verificationUrl, 
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
 * @swagger
 * /verify:
 *   post:
 *     summary: Verify a wallet signature
 *     description: Verify a wallet signature and process Passport verification
 *     tags: [Verification]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: The session ID (can also be provided in body)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signature
 *             properties:
 *               signature:
 *                 type: string
 *                 description: Wallet signature
 *               sessionId:
 *                 type: string
 *                 description: The session ID (if not provided in query)
 *     responses:
 *       200:
 *         description: Signature verified successfully
 *       400:
 *         description: Bad request - missing parameters or invalid signature
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.post("/verify", validateSession, async (req: Request, res: Response) => {
	try {
		const { signature } = req.body;
		const sessionId = req.session!.id as string; // Get sessionId from validated session
		const session = req.session!;

		if (!signature) {
			return res.status(400).json({
				success: false,
				error: "Missing signature parameter",
			});
		}

		// Verify the signature to get the wallet address
		const recoveredAddress = await recoverMessageAddress({
			message: VERIFICATION_MESSAGE,
			signature: signature,
		});

		// Update session with wallet address and signature
		await dynamoDB.updateSession(sessionId, {
			walletAddress: recoveredAddress,
			signature: signature,
			status: STATUS_SIGNATURE_RECEIVED, // Mark signature as received
		});

		logger.info({ sessionId, address: recoveredAddress }, "Signature received and wallet address recovered.");

		// Get the Passport score
		const scoreResponse = await passportService.getScore(recoveredAddress);

		if (!scoreResponse) {
			logger.error({ sessionId, address: recoveredAddress }, "Failed to retrieve passport score.");
			await dynamoDB.updateSession(sessionId, { status: STATUS_VERIFICATION_ERROR });
			return res.status(500).json({
				success: false,
				error: "Failed to retrieve passport score.",
				sessionStatus: STATUS_VERIFICATION_ERROR
			});
		}

		// Parse score and timestamp
		const score = parseFloat(scoreResponse.score);
		const lastScoreTimestamp = scoreResponse.last_score_timestamp
			? new Date(scoreResponse.last_score_timestamp).getTime()
			: Date.now();

		// Check if score meets minimum threshold
		const verified = score >= MINIMUM_SCORE;

		// Update session with score details
		await dynamoDB.updateSession(sessionId, {
			score,
			lastScoreTimestamp,
			verified,
			status: STATUS_SCORE_RETRIEVED, // Mark score as retrieved
		});

		logger.info(
			{ sessionId, address: recoveredAddress, score, verified },
			"Passport score retrieved."
		);

		let roleAssignedSuccess = false;
		let finalStatus = verified ? STATUS_VERIFIED_COMPLETE : STATUS_VERIFICATION_FAILED_SCORE;
		let message = verified ? "Verification successful." : "Verification score did not meet the minimum threshold.";

		if (verified) {
			logger.info({ sessionId, userId: session.discordUserId, score }, "Attempting immediate role assignment...");
			try {
				roleAssignedSuccess = await discordService.assignRole(session.discordUserId, score);
				if (roleAssignedSuccess) {
					logger.info({ sessionId, userId: session.discordUserId, score }, "Role assignment successful.");
					message += " Roles assigned successfully.";
				} else {
					logger.error({ sessionId, userId: session.discordUserId, score }, "Role assignment failed.");
					message += " Could not assign Discord roles. Please contact an admin.";
					// Keep finalStatus as VERIFIED_COMPLETE, but roleAssigned will be false
				}
			} catch (error: any) {
				logger.error({ error: error.message, sessionId, userId: session.discordUserId }, "Error during role assignment.");
				roleAssignedSuccess = false;
				message += " An error occurred during role assignment. Please contact an admin.";
				// Keep finalStatus as VERIFIED_COMPLETE, but roleAssigned will be false
			}
		}

		// Final session update
		await dynamoDB.updateSession(sessionId, {
			roleAssigned: roleAssignedSuccess,
			status: finalStatus,
		});

		logger.info({ sessionId, status: finalStatus, roleAssigned: roleAssignedSuccess }, "Verification process complete.");

		// Return the final result
		return res.status(200).json({
			success: true,
			verified: verified,
			score: score,
			roleAssigned: roleAssignedSuccess,
			address: recoveredAddress,
			sessionStatus: finalStatus,
			message: message
		});

	} catch (error: any) {
		logger.error({ error: error.message, path: req.path, sessionId: req.session?.id }, "Error in /verify route");
		await dynamoDB.updateSession(req.session!.id as string, { status: STATUS_VERIFICATION_ERROR });
		return res.status(500).json({
			success: false,
			error: "Server error during verification",
			sessionStatus: STATUS_VERIFICATION_ERROR
		});
	}
});

/**
 * @swagger
 * /status/discord/{discordUserId}:
 *   get:
 *     summary: Check verification status by Discord user ID
 *     description: Check the verification status of a user by their Discord ID
 *     tags: [Status]
 *     parameters:
 *       - in: path
 *         name: discordUserId
 *         schema:
 *           type: string
 *         required: true
 *         description: Discord user ID
 *     responses:
 *       200:
 *         description: Status returned successfully
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.get("/status/discord/:discordUserId", async (req: Request, res: Response) => {
	try {
		const discordUserId = req.params.discordUserId;
		
		// Find the most recent session for this user (You might need a more robust way, e.g., query by discordUserId and sort by createdAt)
		const session = await dynamoDB.findSessionByDiscordId(discordUserId); // Assuming this method exists and finds the latest session
		
		if (!session) {
			return res.status(404).json({
				success: false,
				error: "No verification session found for this Discord user.",
			});
		}
		
		// Return the status info based on the simplified flow
		return res.status(200).json({
			success: true,
			sessionId: session.sessionId, // Include session ID for reference
			walletConnected: !!session.walletAddress,
			signatureReceived: !!session.signature,
			verified: session.verified, 
			roleAssigned: session.roleAssigned, // Directly reflects the outcome
			score: session.score,
			status: session.status, // Return the final status
			minimumRequiredScore: MINIMUM_SCORE,
			highScoreThreshold: HIGH_SCORE_THRESHOLD,
			isHighScorer: session.score !== null && session.score >= HIGH_SCORE_THRESHOLD, // Check against threshold
			lastChecked: new Date().toISOString()
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
router.get("/test-session", async (req: Request, res: Response) => {
	try {
		// Generate a unique session ID
		const sessionId = randomUUID();
		
		// Create a test user ID
		const testUserId = `testuser${Math.floor(Math.random() * 10000)}`;
		
		// Create a verification session
		const sessionCreated = await dynamoDB.createSession(sessionId, testUserId);
		
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
router.post("/set-wallet-address", validateSession, async (req: Request, res: Response) => {
	try {
		const { address } = req.body;
		
		if (!address) {
			return res.status(400).json({
				success: false,
				error: "Missing address parameter",
			});
		}
		
		console.log(`Setting wallet address: ${address} for session: ${req.session!.id}`);
		
		// Update the wallet address using session ID from req.session
		const updated = await dynamoDB.updateWalletAddress(req.session!.id as string, address);
		
		if (!updated) {
			return res.status(500).json({
				success: false,
				error: "Failed to update wallet address",
			});
		}
		
		// Return success
		return res.status(200).json({
			success: true,
			sessionId: req.session!.id,
			walletAddress: address
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message, path: req.path },
			"Error in set wallet address route"
		);
		
		return res.status(500).json({
			success: false,
			error: "Server error during wallet address update",
		});
	}
});

/**
 * TEST ROUTES - For development use only
 * These routes are used for testing the verification flow
 */
router.post("/test-create-session", async (req: Request, res: Response) => {
	try {
		// Generate a unique session ID
		const sessionId = randomUUID();
		const testUserId = "test-user-" + Math.floor(Math.random() * 10000);

		// Create a verification session
		const sessionCreated = await dynamoDB.createSession(sessionId, testUserId);

		// Return the session ID to the client
		return res.status(200).json({
			success: true,
			sessionId,
			testUserId,
		});
	} catch (error: any) {
		logger.error({ error: error.message }, "Error in test create session route");
		return res.status(500).json({
			success: false,
			error: "Server error",
		});
	}
});

/**
 * Route to simulate wallet connection
 */
router.post("/test-connect-wallet", async (req: Request, res: Response) => {
	try {
		const { sessionId, address } = req.body;
		
		if (!sessionId || !address) {
			return res.status(400).json({
				success: false,
				error: "Missing sessionId or address",
			});
		}
		
		// Get the session
		const session = await dynamoDB.getSession(sessionId as string);
		if (!session) {
			return res.status(404).json({
				success: false,
				error: "Session not found",
			});
		}
		
		// Update the session with the wallet address
		const updated = await dynamoDB.updateWalletAddress(sessionId as string, address);
		
		if (!updated) {
			return res.status(500).json({
				success: false,
				error: "Failed to update session",
			});
		}
		
		// Return success
		const updatedSession = await dynamoDB.getSession(sessionId as string);
		
		return res.status(200).json({
			success: true,
			session: updatedSession,
		});
	} catch (error: any) {
		logger.error({ error: error.message }, "Error in test connect wallet route");
		return res.status(500).json({
			success: false,
			error: "Server error",
		});
	}
});

/**
 * Route to test DynamoDB connection and basic operations
 * This can be used to verify that DynamoDB is working correctly
 */
router.get("/dynamo-health", async (req: Request, res: Response) => {
	try {
		const startTime = Date.now();
		const healthCheckId = `health-check-${Date.now()}`;
		const health = {
			dynamoConnection: false,
			tableOperations: {
				create: false,
				read: false,
				delete: false
			},
			testSessionId: healthCheckId,
			latency: {
				create: 0,
				read: 0,
				delete: 0,
				total: 0
			},
			error: null,
			errorOperation: null,
			environment: {
				isLocal: process.env.LOCAL_DYNAMO_DB === "true",
				tableName: process.env.SESSION_TABLE_NAME || "sparta-sessions",
				endpoint: process.env.LOCAL_DYNAMO_DB === "true" ? 
					(process.env.DYNAMODB_LOCAL_ENDPOINT || "http://localhost:8000") : "AWS DynamoDB"
			}
		};

		try {
			// 1. Test creation
			const createStart = Date.now();
			logger.info(`DynamoDB Health Check - Creating test session: ${healthCheckId}`);
			const session = await dynamoDB.createSession(healthCheckId, "health-check-user");
			const createEnd = Date.now();
			health.latency.create = createEnd - createStart;
			
			if (!session) {
				throw new Error("Failed to create test session");
			}
			health.tableOperations.create = true;
			logger.info(`DynamoDB Health Check - Created test session successfully`);

			// 2. Test reading
			const readStart = Date.now();
			logger.info(`DynamoDB Health Check - Reading test session: ${healthCheckId}`);
			const retrievedSession = await dynamoDB.getSession(healthCheckId);
			const readEnd = Date.now();
			health.latency.read = readEnd - readStart;
			
			if (!retrievedSession) {
				throw new Error("Failed to read test session");
			}
			health.tableOperations.read = true;
			logger.info(`DynamoDB Health Check - Read test session successfully`);

			// 3. Test deletion (cleanup) - Commented out as deleteSession doesn't exist
			/*
			const deleteStart = Date.now();
			logger.info(`DynamoDB Health Check - Deleting test session: ${healthCheckId}`);
			const deleteResult = await dynamoDB.deleteSession(healthCheckId);
			const deleteEnd = Date.now();
			health.latency.delete = deleteEnd - deleteStart;
			
			if (!deleteResult) {
				throw new Error("Failed to delete test session");
			}
			health.tableOperations.delete = true;
			logger.info(`DynamoDB Health Check - Deleted test session successfully`);
			*/
			health.tableOperations.delete = false; // Mark as not tested

			health.dynamoConnection = true;
			health.error = null;
			health.errorOperation = null;
			health.latency.total = health.latency.create + health.latency.read + health.latency.delete;

			return res.status(200).json({
				success: true,
				health,
			});
		} catch (error: any) {
			logger.error(
				{ error: error.message },
				"Error in DynamoDB health check"
			);

			health.dynamoConnection = false;
			health.error = error.message;
			health.errorOperation = error.operation;
			health.latency.total = Date.now() - startTime;

			return res.status(500).json({
				success: false,
				error: "Server error during health check",
				health,
			});
		}
	} catch (error: any) {
		logger.error(
			{ error: error.message },
			"Error in DynamoDB health check"
		);

		return res.status(500).json({
			success: false,
			error: "Server error during health check",
		});
	}
});

export default router;

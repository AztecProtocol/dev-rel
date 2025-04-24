/**
 * @fileoverview API routes for Human Passport verification (within Discord Bot)
 * @description Express routes for handling wallet verification with Human Passport
 * @module sparta/express/routes/passport-routes
 */

import express, { type Request, type Response, type NextFunction } from "express";
import { PassportService } from "../services/passport-service.js";
import { logger, dynamoDB } from "@sparta/utils/index.js";
import { randomUUID } from "crypto";
import { recoverMessageAddress, type Hex } from "viem";
// import { DeleteCommand } from "@aws-sdk/lib-dynamodb"; // Unused
import type { Session } from "@sparta/utils/dynamo-db";
import DiscordService from "../discord/services/discord-service.js"; // Import DiscordService
import {
	MINIMUM_SCORE,
	HIGH_SCORE_THRESHOLD,
	STATUS_SCORE_RETRIEVED,
	STATUS_VERIFIED_COMPLETE,
	STATUS_VERIFICATION_FAILED_SCORE,
	STATUS_VERIFICATION_ERROR,
	// STATUS_SESSION_USED, // Unused
	// STATUS_WALLET_CONNECTED, // Unused
	STATUS_SIGNATURE_RECEIVED,
	VERIFICATION_MESSAGE, // Import shared constant
} from "@sparta/utils/const.js"; // Import status constants

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

// --- Helper Functions for /verify --- 

/**
 * Recovers address from signature and updates session.
 * Throws error if recovery fails.
 */
async function _handleSignatureRecovery(sessionId: string, signature: Hex): Promise<Hex> {
	try {
		const recoveredAddress = await recoverMessageAddress({
			message: VERIFICATION_MESSAGE,
			signature: signature,
		});

		await dynamoDB.updateSession(sessionId, {
			walletAddress: recoveredAddress,
			signature: signature,
			status: STATUS_SIGNATURE_RECEIVED,
		});
		logger.info({ sessionId, address: recoveredAddress }, "Signature received and wallet address recovered.");
		return recoveredAddress;
	} catch (error: any) {
		logger.error({ error: error.message, sessionId }, "Error recovering address from signature.");
		// Rethrow or handle more specifically if needed
		throw new Error("Failed to verify signature."); 
	}
}

interface ScoringResult {
	score: number;
	verified: boolean;
	lastScoreTimestamp: number;
}
/**
 * Gets passport score, updates session, and determines verification status.
 * Throws error if scoring fails.
 */
async function _handleScoring(sessionId: string, address: Hex): Promise<ScoringResult> {
	const scoreResponse = await passportService.getScore(address);

	if (!scoreResponse) {
		logger.error({ sessionId, address }, "Failed to retrieve passport score.");
		await dynamoDB.updateSession(sessionId, { status: STATUS_VERIFICATION_ERROR });
		throw new Error("Failed to retrieve passport score.");
	}

	// Basic validation/parsing (consider more robust parsing if needed)
	const score = parseFloat(scoreResponse.score); 
	if (isNaN(score)) {
		logger.error({ sessionId, address, scoreResponse }, "Invalid score format received.");
		await dynamoDB.updateSession(sessionId, { status: STATUS_VERIFICATION_ERROR });
		throw new Error("Invalid score format received from passport service.");
	}

	const lastScoreTimestamp = scoreResponse.last_score_timestamp
		? new Date(scoreResponse.last_score_timestamp).getTime()
		: Date.now();

	const verified = score >= MINIMUM_SCORE;

	await dynamoDB.updateSession(sessionId, {
		score,
		lastScoreTimestamp,
		verified,
		status: STATUS_SCORE_RETRIEVED,
	});

	logger.info(
		{ sessionId, address, score, verified },
		"Passport score retrieved."
	);
	return { score, verified, lastScoreTimestamp };
}

/**
 * Attempts to assign Discord roles based on score.
 * Returns true if successful, false otherwise (logs errors).
 */
async function _handleRoleAssignment(sessionId: string, discordUserId: string, score: number): Promise<boolean> {
	logger.info({ sessionId, userId: discordUserId, score }, "Attempting immediate role assignment...");
	try {
		const success = await discordService.assignRole(discordUserId, score);
		if (success) {
			logger.info({ sessionId, userId: discordUserId, score }, "Role assignment successful.");
		} else {
			logger.error({ sessionId, userId: discordUserId, score }, "Role assignment failed (discordService returned false).");
		}
		return success;
	} catch (error: any) {
		logger.error({ error: error.message, sessionId, userId: discordUserId }, "Error during role assignment.");
		return false;
	}
}

// --- Route Definitions --- 

// Standard verification message for wallet signature
// This is just for wallet ownership verification, not for the Passport API (v2 doesn't need a signed message)
// const VERIFICATION_MESSAGE = "Verify wallet ownership for Aztec Discord"; // Remove local definition

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
		return; // Add explicit return after calling next()
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
		const sessionId = req.session!.id as string; 
		const session = req.session!;

		if (!signature) {
			return res.status(400).json({
				success: false,
				error: "Missing signature parameter",
			});
		}

        // Step 1: Handle signature recovery and initial update
        const recoveredAddress = await _handleSignatureRecovery(sessionId, signature as Hex);
        logger.debug({ sessionId, recoveredAddress }, "Address recovered from signature");

        // Step 2: Handle scoring and update session
        const { score, verified } = await _handleScoring(sessionId, recoveredAddress);
        logger.info({ sessionId, score, verified }, "Score fetched");

        // Step 3: Attempt role assignment if verified
		let roleAssignedSuccess = false;
		let message = verified ? "Verification successful." : "Verification score did not meet the minimum threshold.";

		if (verified) {
            roleAssignedSuccess = await _handleRoleAssignment(sessionId, session.discordUserId, score);
            if (roleAssignedSuccess) {
                message += " Roles assigned successfully.";
            } else {
                message += " Could not assign Discord roles. Please contact an admin.";
                // Decide if role assignment failure should be treated as a bigger error (e.g., return 500 or specific error code?)
            }
		}

        // Step 4: Final session status update
		const finalStatus = verified ? STATUS_VERIFIED_COMPLETE : STATUS_VERIFICATION_FAILED_SCORE;
		await dynamoDB.updateSession(sessionId, {
			roleAssigned: roleAssignedSuccess,
			status: finalStatus,
		});

		logger.info({ sessionId, status: finalStatus, roleAssigned: roleAssignedSuccess }, "Verification process complete.");

        // Step 5: Return final result to client
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
        // Handle errors thrown from helper functions or initial validation
        const sessionIdentifier = req.session?.id || req.query.sessionId || req.body.sessionId || 'unknown';
		logger.error({ error: error.message, path: req.path, sessionId: sessionIdentifier }, "Error in /verify route");
        
        // Update status to generic error only if session ID is known
        if (req.session?.id) {
            try {
                await dynamoDB.updateSession(req.session.id, { status: STATUS_VERIFICATION_ERROR });
            } catch (updateError: any) {
                logger.error({ error: updateError.message, sessionId: req.session.id }, "Failed to update session status during error handling.");
            }
        }

		return res.status(500).json({
			success: false,
			error: error.message || "Server error during verification", // Use error message from thrown error
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
		const { discordUserId } = req.query;

		if (typeof discordUserId !== 'string') {
			return res.status(400).json({ 
				success: false, 
				error: 'Missing or invalid discordUserId query parameter' 
			});
		}

		// Now discordUserId is guaranteed to be a string
		const session = await dynamoDB.findSessionByDiscordId(discordUserId); 
		
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
 * Route to test DynamoDB connection and basic operations
 * This can be used to verify that DynamoDB is working correctly
 */
router.get("/dynamo-health", async (_req: Request, res: Response) => { // Mark req as unused
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
			error: null as string | null,
			errorOperation: null as string | null,
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

			// 3. Test deletion (cleanup) - Add a call to delete if available
			// Assuming dynamoDB might have a deleteSession method
			if (typeof (dynamoDB as any).deleteSession === 'function') {
				try {
					const deleteStart = Date.now();
					logger.info(`DynamoDB Health Check - Deleting test session: ${healthCheckId}`);
					const deleteResult = await (dynamoDB as any).deleteSession(healthCheckId);
					const deleteEnd = Date.now();
					health.latency.delete = deleteEnd - deleteStart;
					
					if (!deleteResult) { // Check the actual result structure if needed
						logger.warn(`DynamoDB Health Check - Delete operation did not return truthy value`);
					}
					health.tableOperations.delete = true; // Mark as attempted/successful
					logger.info(`DynamoDB Health Check - Deleted test session successfully`);
				} catch (deleteError: any) {
					logger.error({ error: deleteError.message }, `DynamoDB Health Check - Failed to delete test session: ${healthCheckId}`);
					health.tableOperations.delete = false; // Mark as failed
				}
			} else {
				logger.warn(`DynamoDB Health Check - deleteSession method not found, skipping delete test.`);
				health.tableOperations.delete = false; // Mark as not tested
			}

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
				{ error: error.message, operation: health.errorOperation }, // Include which operation failed
				"Error during DynamoDB health check operation"
			);

			health.dynamoConnection = false; // Potentially still connected, but an operation failed
			health.error = error.message;
			// Determine which operation failed based on progress
			if (!health.tableOperations.create) health.errorOperation = 'create';
			else if (!health.tableOperations.read) health.errorOperation = 'read';
			else if (!health.tableOperations.delete) health.errorOperation = 'delete';
			
			health.latency.total = Date.now() - startTime;

			return res.status(500).json({
				success: false,
				error: `Server error during health check (${health.errorOperation || 'unknown'} operation)`, // More specific error
				health,
			});
		}
	} catch (error: any) {
		// Catch errors from the outer try block (e.g., Date.now() fails? unlikely)
		logger.error(
			{ error: error.message },
			"Unexpected error in DynamoDB health check route"
		);

		return res.status(500).json({
			success: false,
			error: "Unexpected server error during health check",
		});
	}
});

export default router;

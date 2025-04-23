/**
 * @fileoverview API routes for Human Passport verification (within Discord Bot)
 * @description Express routes for handling wallet verification with Human Passport
 * @module sparta/discord/routes/passport-routes
 */

import express, { type Request, type Response } from "express";
import cors from "cors";
import { passportService } from "../services/index.js"; // Updated path relative to discord-bot
import { logger, inMemoryDB } from "@sparta/utils"; // Use shared utils

const router = express.Router();

// Enable CORS for the API routes
router.use(cors());
router.use(express.json());

/**
 * Route to validate a session
 * Used to check if a session exists and is valid
 */
router.get("/session/:sessionId", (req: Request, res: Response) => {
	try {
		const { sessionId } = req.params;
		const session = inMemoryDB.getSession(sessionId);

		if (!session) {
			return res.status(404).json({
				success: false,
				error: "Session not found or expired",
			});
		}

		// Return limited session info (don't expose Discord user ID)
		return res.status(200).json({
			success: true,
			sessionValid: true,
			walletConnected: !!session.walletAddress,
			verified: session.verified,
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message, path: req.path },
			"Error in session validation route"
		);

		return res.status(500).json({
			success: false,
			error: "Server error",
		});
	}
});

/**
 * Route requested by the React frontend to verify a session ID from query param.
 * @todo Implement actual session lookup and verification logic.
 */
router.get("/verify", (req: Request, res: Response) => {
	try {
		const sessionId = req.query.session as string | undefined;

		if (!sessionId) {
			return res.status(400).json({
				success: false,
				error: "Missing session query parameter",
			});
		}

		// --- Placeholder Verification Logic ---
		// Replace this with actual logic to check if the session ID is valid
		// For example, using inMemoryDB.getSession(sessionId);
		const session = inMemoryDB.getSession(sessionId);
		if (session) {
			// Optionally return some relevant session data if needed by the frontend
			// Avoid exposing sensitive data like discordUserId
			res.status(200).json({
				success: true,
				message: "Session is valid (placeholder)",
				sessionValid: true, // Indicate validity
				walletConnected: !!session.walletAddress, // Example data
				verified: session.verified, // Example data
			});
		} else {
			res.status(404).json({
				success: false,
				error: "Session not found or invalid (placeholder)",
				sessionValid: false,
			});
		}
		// --- End Placeholder ---
	} catch (error: any) {
		logger.error(
			{
				error: error.message,
				path: req.path,
				sessionId: req.query.session,
			},
			"Error in /verify session route"
		);
		return res.status(500).json({
			success: false,
			error: "Server error during session verification",
		});
	}
});

/**
 * Route to store a connected wallet address
 */
router.post("/connect-wallet", async (req: Request, res: Response) => {
	try {
		const { sessionId, walletAddress } = req.body;

		if (!sessionId || !walletAddress) {
			return res.status(400).json({
				success: false,
				error: "Missing required parameters",
			});
		}

		// Validate address format
		if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
			return res.status(400).json({
				success: false,
				error: "Invalid Ethereum address format",
			});
		}

		// Validate the session
		const session = inMemoryDB.getSession(sessionId);
		if (!session) {
			return res.status(404).json({
				success: false,
				error: "Session not found or expired",
			});
		}

		// Update the session with the wallet address
		const updated = inMemoryDB.updateWalletAddress(
			sessionId,
			walletAddress
		);

		if (!updated) {
			return res.status(500).json({
				success: false,
				error: "Failed to update session",
			});
		}

		// Get message and nonce for signing
		const messageAndNonce = await passportService.getMessageAndNonce();

		if (!messageAndNonce) {
			return res.status(500).json({
				success: false,
				error: "Failed to get message and nonce from Passport API",
			});
		}

		// Store the nonce in the session
		inMemoryDB.updateNonce(sessionId, messageAndNonce.nonce);

		// Return the message to be signed
		return res.status(200).json({
			success: true,
			message: messageAndNonce.message,
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message, path: req.path },
			"Error in connect wallet route"
		);

		return res.status(500).json({
			success: false,
			error: "Server error",
		});
	}
});

/**
 * Route to verify a signature and process Passport verification
 */
router.post("/verify-signature", async (req: Request, res: Response) => {
	try {
		const { sessionId, signature } = req.body;

		if (!sessionId || !signature) {
			return res.status(400).json({
				success: false,
				error: "Missing required parameters",
			});
		}

		// Process the verification
		const result = await passportService.processVerification(
			sessionId,
			signature
		);

		// Return the result
		return res.status(200).json({
			success: true,
			verified: result,
		});
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
 * Route to check the verification status
 */
router.get("/status/:sessionId", (req: Request, res: Response) => {
	try {
		const { sessionId } = req.params;
		const session = inMemoryDB.getSession(sessionId);

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
			"Error in status check route"
		);

		return res.status(500).json({
			success: false,
			error: "Server error",
		});
	}
});

export default router;

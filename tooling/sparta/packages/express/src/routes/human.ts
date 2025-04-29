/**
 * @fileoverview API routes for Human Passport verification (within Discord Bot)
 * @description Express routes for handling wallet verification with Human Passport
 * @module sparta/express/routes/human
 */

import express, { type Request, type Response, type NextFunction } from "express";
import { PassportService } from "../domain/humanPassport/services/humanPassportService.js";
import { logger, dynamoDB } from "@sparta/utils/index.js";
import { randomUUID } from "crypto";
import { recoverMessageAddress, type Hex } from "viem";
// import { DeleteCommand } from "@aws-sdk/lib-dynamodb"; // Unused
import type { Session } from "@sparta/utils/dynamo-db";
import type { User, HumanPassport } from "./users.js";
import {
	VERIFICATION_MESSAGE,
	VERIFICATION_STATUS
} from "@sparta/utils/const.js"; // Import status constants
import { EmbedBuilder } from 'discord.js'; 
import { _handleRoleAssignment } from "../domain/discord/utils/roleAssigner.js";
import { DiscordService } from "../domain/discord/services/discord-service.js";
import { discord } from "../domain/discord/clients/discord.js";
import { initializeUserRepository, extendedDynamoDB } from "../db/userRepository.js";
import { validateVerification } from "../middlewares/humanPassport.js";
import { _handleScoring, _updateUserVerificationStatus } from "../domain/humanPassport/utils/scorer.js";

// Initialize the User repository so we have access to createUser
initializeUserRepository();

// Define the verification status


const router = express.Router();
const passportService = PassportService.getInstance();
const discordService = DiscordService.getInstance();

// --- Helper Functions --- 

/**
 * Recovers address from signature and updates user.
 * Throws error if recovery fails.
 */
async function _handleSignatureRecovery(verificationId: string, signature: Hex): Promise<Hex> {
	try {
		const recoveredAddress = await recoverMessageAddress({
			message: VERIFICATION_MESSAGE,
			signature: signature,
		});

		// Find and update the user with the human passport data
		const user = await extendedDynamoDB.getUserByVerificationId(verificationId);
		if (user) {
			// Create or update HumanPassport object
			const humanPassport: HumanPassport = {
				...user.humanPassport || {},
				status: VERIFICATION_STATUS.SIGNATURE_RECEIVED,
				verificationId: verificationId
			};

			await extendedDynamoDB.updateUser(user.discordUserId, {
				walletAddress: recoveredAddress,
				humanPassport,
				updatedAt: Date.now()
			});
		}

		logger.info({ verificationId, address: recoveredAddress }, "Signature received and wallet address recovered.");
		return recoveredAddress;
	} catch (error: any) {
		logger.error({ error: error.message, verificationId }, "Error recovering address from signature.");
		// Rethrow error
		throw new Error("Failed to verify signature."); 
	}
}


// --- Removed middleware, now imported from middlewares/verification-middleware.js ---

// --- Route Definitions --- 

router.use(express.json());

/**
 * @swagger
 * /api/human/verify:
 *   post:
 *     summary: Verify a wallet signature
 *     description: Verify a wallet signature and process Passport verification
 *     tags: [Human]
 *     parameters:
 *       - in: query
 *         name: verificationId
 *         schema:
 *           type: string
 *         description: The verification ID (can also be provided in body)
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
 *               verificationId:
 *                 type: string
 *                 description: The verification ID (if not provided in query)
 *     responses:
 *       200:
 *         description: Signature verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyResponse'
 *       400:
 *         description: Bad request - missing parameters or invalid signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Verification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/verify", validateVerification, async (req: Request, res: Response) => {
	try {
		const { signature } = req.body;
		const verificationId = req.verificationId!;
		const user = req.user!;

		if (!signature) {
			return res.status(400).json({
				success: false,
				error: "Missing signature parameter",
			});
		}

        // Step 1: Handle signature recovery and initial update
        const recoveredAddress = await _handleSignatureRecovery(verificationId, signature as Hex);
        logger.debug({ verificationId, recoveredAddress }, "Address recovered from signature");

        // Step 2: Handle scoring and update user record
        const { score, verified } = await _handleScoring(verificationId, recoveredAddress);
        logger.info({ verificationId, score, verified }, "Score fetched");

        // Step 3: Attempt role assignment if verified
		let roleAssignedSuccess = false;
		let message = verified ? "Verification successful." : "Verification score did not meet the minimum threshold.";
		
		if (verified) {
			try {
				// Attempt to assign roles via Discord API
				roleAssignedSuccess = await _handleRoleAssignment(verificationId, user.discordUserId, score);
				
				// Update message based on role assignment status
				if (roleAssignedSuccess) {
					message += " Roles assigned successfully.";
				} else {
					message += " Could not assign Discord roles. Please contact an admin.";
				}
				
				// Send interaction reply updates to Discord if token is available
				const interactionToken = user.humanPassport?.interactionToken;
				if (interactionToken) {
					try {
						let finalEmbed = new EmbedBuilder()
							.setTitle("Human Passport Verification Complete")
							.setColor(roleAssignedSuccess ? 0x00FF00 : 0xFFCC00) // Green for success, Yellow for partial
							.addFields(
								{ name: "Status", value: message },
								{ name: "Score", value: score.toString() },
								{ name: "Minimum Required", value: (process.env.MINIMUM_SCORE || '0') }
							)
							.setFooter({ text: "You can dismiss this message." });

						await discordService.editInteractionReply(interactionToken, { 
							embeds: [finalEmbed],
							components: [] // Remove the button
						});
					} catch (replyError) {
						logger.error(
							{ error: replyError, verificationId }, 
							"Error updating Discord interaction reply"
						);
					}
				}
			} catch (roleError: any) {
				logger.error({ error: roleError, discordUserId: user.discordUserId }, "Error assigning roles");
				message = "Verification successful, but there was an issue assigning Discord roles. Please contact an admin.";
				roleAssignedSuccess = false;
			}
		}
        // If verification failed due to low score, update the interaction reply as well
        else if (user.humanPassport?.interactionToken) {
            try {
				const failEmbed = new EmbedBuilder()
					.setTitle("Human Passport Verification Failed")
					.setColor(0xFF0000) // Red for failure
					.setDescription(`Your Human Passport score of **${score}** did not meet the minimum requirement of **${(process.env.MINIMUM_SCORE || '0')}**. No roles were assigned.`)
					.setFooter({ text: "You can dismiss this message." });
				
				await discordService.editInteractionReply(user.humanPassport.interactionToken, {
					embeds: [failEmbed],
					components: [] // Remove button
				});
			} catch (replyError) {
				logger.error(
					{ error: replyError, verificationId }, 
					"Error updating Discord interaction reply for failed verification"
				);
			}
        }

        // Step 4: Create updated humanPassport object
		const finalStatus = verified ? VERIFICATION_STATUS.VERIFICATION_COMPLETE : VERIFICATION_STATUS.VERIFICATION_FAILED;
		const humanPassport: HumanPassport = {
			...user.humanPassport || {},
			status: finalStatus,
			score: score,
			lastVerificationTime: Date.now()
		};
		
		await extendedDynamoDB.updateUser(user.discordUserId, {
			humanPassport,
			role: verified && roleAssignedSuccess ? 'verified_human' : user.role,
			updatedAt: Date.now()
		});

		logger.info({ verificationId, status: finalStatus, roleAssigned: roleAssignedSuccess }, "Verification process complete.");

        // Step 5: Return final result to client
		return res.status(200).json({
			success: true,
			verified: verified,
			score: score,
			roleAssigned: roleAssignedSuccess,
			address: recoveredAddress,
			status: finalStatus,
			message: message,
			minimumRequiredScore: parseInt(process.env.MINIMUM_SCORE || '0'),
			highScoreThreshold: parseInt(process.env.HIGH_SCORE_THRESHOLD || '10'),
			isHighScorer: score >= parseInt(process.env.HIGH_SCORE_THRESHOLD || '10'),
		});

	} catch (error: any) {
        // Handle errors thrown from helper functions or initial validation
        const verificationId = req.verificationId || req.query.verificationId || req.body.verificationId || 'unknown';
		logger.error({ error: error.message, path: req.path, verificationId }, "Error in /verify route");
        
        // Update status to generic error only if verification ID is known
        if (req.verificationId && req.user) {
            try {
                // Create updated humanPassport object with error status
                const humanPassport: HumanPassport = {
					...req.user.humanPassport || {},
					status: VERIFICATION_STATUS.ERROR
				};
				
				await extendedDynamoDB.updateUser(req.user.discordUserId, {
					humanPassport,
					updatedAt: Date.now()
				});
            } catch (updateError: any) {
                logger.error({ error: updateError.message, verificationId: req.verificationId }, "Failed to update user status during error handling.");
            }
        }

		return res.status(500).json({
			success: false,
			error: error.message || "Server error during verification",
			status: VERIFICATION_STATUS.ERROR
		});
	}
});

/**
 * @swagger
 * /api/human/status/discord/{discordUserId}:
 *   get:
 *     summary: Check verification status by Discord user ID
 *     description: Check the human verification status of a user by their Discord ID
 *     tags: [Human]
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerificationStatusResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/status/discord/:discordUserId", async (req: Request, res: Response) => {
	try {
		const { discordUserId } = req.params;

		if (!discordUserId) {
			return res.status(400).json({ 
				success: false, 
				error: 'Missing discordUserId parameter' 
			});
		}

		// Get user directly
		const user = await extendedDynamoDB.getUser(discordUserId); 
		
		if (!user) {
			return res.status(404).json({
				success: false,
				error: "No user record found for this Discord user.",
			});
		}
		
		const humanPassport = user.humanPassport;
		if (!humanPassport) {
			return res.status(404).json({
				success: false,
				error: "No verification record found for this Discord user.",
			});
		}
		
		// Return the status info
		return res.status(200).json({
			success: true,
			verificationId: humanPassport.verificationId, // Include verification ID for reference
			walletConnected: !!user.walletAddress,
			verified: humanPassport.status === VERIFICATION_STATUS.VERIFICATION_COMPLETE, 
			roleAssigned: user.role === 'verified_human', 
			score: humanPassport.score,
			status: humanPassport.status, // Return the current verification status
			minimumRequiredScore: parseInt(process.env.MINIMUM_SCORE || '0'),
			highScoreThreshold: parseInt(process.env.HIGH_SCORE_THRESHOLD || '10'),
			isHighScorer: humanPassport.score !== null && humanPassport.score !== undefined && 
                         humanPassport.score >= parseInt(process.env.HIGH_SCORE_THRESHOLD || '10'),
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
 * @swagger
 * /api/human/status/verification/{verificationId}:
 *   get:
 *     summary: Check verification status by verification ID
 *     description: Check the human verification status of a user by their verification ID
 *     tags: [Human]
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         schema:
 *           type: string
 *         required: true
 *         description: Verification ID
 *     responses:
 *       200:
 *         description: Status returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerificationStatusResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/status/verification/:verificationId", async (req: Request, res: Response) => {
	try {
		const { verificationId } = req.params;

		if (!verificationId) {
			return res.status(400).json({ 
				success: false, 
				error: 'Missing verificationId parameter' 
			});
		}

		// Get user directly
		const user = await extendedDynamoDB.getUserByVerificationId(verificationId); 
		
		if (!user) {
			return res.status(404).json({
				success: false,
				error: "No user record found for this verification ID.",
			});
		}
		
		const humanPassport = user.humanPassport;
		if (!humanPassport) {
			return res.status(404).json({
				success: false,
				error: "No verification record found for this verification ID.",
			});
		}
		
		// Return the status info
		return res.status(200).json({
			success: true,
			verificationId: humanPassport.verificationId, // Include verification ID for reference
			walletConnected: !!user.walletAddress,
			verified: humanPassport.status === VERIFICATION_STATUS.VERIFICATION_COMPLETE, 
			roleAssigned: user.role === 'verified_human', 
			score: humanPassport.score,
			status: humanPassport.status, // Return the current verification status
			minimumRequiredScore: parseInt(process.env.MINIMUM_SCORE || '0'),
			highScoreThreshold: parseInt(process.env.HIGH_SCORE_THRESHOLD || '10'),
			isHighScorer: humanPassport.score !== null && humanPassport.score !== undefined && 
                         humanPassport.score >= parseInt(process.env.HIGH_SCORE_THRESHOLD || '10'),
			lastChecked: new Date().toISOString()
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message, path: req.path },
			"Error in status check by verification ID route"
		);

		return res.status(500).json({
			success: false,
			error: "Server error during status check",
		});
	}
});


/**
 * @swagger
 * /api/human/score:
 *   get:
 *     summary: Get passport score for a given address and verification
 *     description: Fetches the Gitcoin Passport score for the wallet address associated with a verification ID
 *     tags: [Human]
 *     parameters:
 *       - in: query
 *         name: verificationId
 *         schema:
 *           type: string
 *         required: true
 *         description: The verification ID obtained during verification initiation.
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: The wallet address to check (case-insensitive comparison).
 *     responses:
 *       200:
 *         description: Score retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScoreResponse'
 *       400:
 *         description: Bad request (missing parameters)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Verification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error during score fetching or processing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/score", async (req: Request, res: Response) => {
	const { address: providedAddress, verificationId } = req.query;

	if (!verificationId || !providedAddress || typeof verificationId !== 'string' || typeof providedAddress !== 'string') {
		return res.status(400).json({ success: false, error: "Missing or invalid 'verificationId' or 'address' query parameters" });
	}

	// Use the address provided directly from the frontend query for this pre-check
	const addressToCheck = providedAddress as Hex; 

	try {
		// Check if there's a user with this verification ID
		const user = await extendedDynamoDB.getUserByVerificationId(verificationId);
		if (!user) {
			return res.status(404).json({ success: false, error: "User not found" });
		}

		// Get score from passport service
		logger.info({ verificationId, address: addressToCheck }, "Fetching score for provided address (pre-signature check)...");
		const scoreResponse = await passportService.getScore(addressToCheck);
		const minimumScore = parseFloat(process.env.MINIMUM_SCORE || '0');

		if (!scoreResponse || typeof scoreResponse.score === 'undefined') {
			logger.error({ verificationId, address: addressToCheck }, "Failed to retrieve passport score or score was undefined.");
			// Don't update user status here, just report error to frontend
			return res.status(500).json({ success: false, error: "Failed to retrieve passport score.", status: VERIFICATION_STATUS.ERROR });
		}

		const score = parseFloat(scoreResponse.score);
		if (isNaN(score)) {
			logger.error({ verificationId, address: addressToCheck, scoreResponse }, "Invalid score format received during score check.");
			return res.status(500).json({ success: false, error: "Invalid score format received.", status: VERIFICATION_STATUS.ERROR });
		}

		const isSufficient = score >= minimumScore;
		// Use a more specific status for this pre-check
		const status = isSufficient ? 'score_sufficient' : VERIFICATION_STATUS.VERIFICATION_FAILED; 

		// No user update needed here, just returning the check result
		logger.info({ verificationId, address: addressToCheck, score, minimumScore, isSufficient }, "Pre-signature score check completed.");

		return res.status(200).json({
			success: isSufficient, // Success means score is sufficient
			score: score,
			status: status,
			minimumScore: minimumScore // Return minimum score for context
		});
	} catch (error: any) {
		logger.error({ error: error.message, verificationId, address: addressToCheck }, "Error during GET /score processing.");
		return res.status(500).json({
			success: false,
			error: "Server error during score check.",
			status: VERIFICATION_STATUS.ERROR,
		});
	}
});

export default router;

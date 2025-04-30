/**
 * @fileoverview API routes for Human Passport verification (within Discord Bot)
 * @description Express routes for handling wallet verification with Human Passport
 * @module sparta/express/routes/human
 */

import express, { type Request, type Response } from "express";
import { PassportService } from "../domain/humanPassport/service.js";
import { logger } from "@sparta/utils/index.js";
import { recoverMessageAddress, type Hex } from "viem";
import type { HumanPassport } from "./users.js";
import {
	VERIFICATION_MESSAGE,
	VERIFICATION_STATUS,
} from "@sparta/utils/const.js"; // Import status constants
import { EmbedBuilder } from "discord.js";
import { _handleRoleAssignment } from "@sparta/discord/src/utils/roleAssigner.js";
import { DiscordService } from "@sparta/discord/src/services/discord-service.js";
import {
	initializeUserRepository,
	extendedDynamoDB,
} from "../db/userRepository.js";
import { validateVerification } from "../middlewares/humanPassport.js";
import {
	_handleScoring,
	_updateUserVerificationStatus,
} from "../domain/humanPassport/utils.js";

// Define shared schemas
/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: Error message describing the issue.
 *       required:
 *         - success
 *         - error
 *     VerifyResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         verified:
 *           type: boolean
 *           description: Whether the overall verification (score + role assignment) was successful.
 *         score:
 *           type: number
 *           description: The user's Gitcoin Passport score.
 *         roleAssigned:
 *           type: boolean
 *           description: Whether the Discord role was successfully assigned/updated.
 *         address:
 *           type: string
 *           description: The wallet address recovered from the signature.
 *         status:
 *           type: string
 *           description: Final status of the verification process (e.g., verification_complete, verification_failed).
 *         message:
 *           type: string
 *           description: A user-friendly message summarizing the result.
 *         minimumRequiredScore:
 *           type: number
 *           description: The minimum score required for verification.
 *       required:
 *         - success
 *         - verified
 *         - score
 *         - roleAssigned
 *         - address
 *         - status
 *         - message
 *         - minimumRequiredScore
 *     VerificationStatusResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         verificationId:
 *           type: string
 *           description: The verification ID associated with this status check.
 *         walletConnected:
 *           type: boolean
 *           description: Whether a wallet address is associated with this verification.
 *         verified:
 *           type: boolean
 *           description: Whether the verification process was successfully completed (met score threshold).
 *         roleAssigned:
 *           type: boolean
 *           description: Whether the Discord role was assigned.
 *         score:
 *           type: number
 *           nullable: true
 *           description: The user's score, if verification was attempted.
 *         status:
 *           type: string
 *           description: The current status of the verification process (e.g., pending_signature, verification_complete).
 *         minimumRequiredScore:
 *           type: number
 *           description: The minimum score required for verification.
 *         lastChecked:
 *           type: string
 *           format: date-time
 *           description: The timestamp when this status check was performed.
 *       required:
 *         - success
 *         - verificationId
 *         - walletConnected
 *         - verified
 *         - roleAssigned
 *         - status
 *         - minimumRequiredScore
 *         - lastChecked
 *     ScoreResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: True if the score is sufficient, false otherwise.
 *         score:
 *           type: number
 *           description: The fetched Gitcoin Passport score.
 *         status:
 *           type: string
 *           description: Status indicating score sufficiency (e.g., score_sufficient, verification_failed).
 *         minimumScore:
 *           type: number
 *           description: The minimum score required.
 *       required:
 *         - success
 *         - score
 *         - status
 *         - minimumScore
 */

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
async function _handleSignatureRecovery(
	verificationId: string,
	signature: Hex
): Promise<Hex> {
	try {
		const recoveredAddress = await recoverMessageAddress({
			message: VERIFICATION_MESSAGE,
			signature: signature,
		});

		// Find and update the user with the human passport data
		const user = await extendedDynamoDB.getUserByVerificationId(
			verificationId
		);

		if (!user) {
			throw new Error("User not found");
		}

		logger.info(
			{ verificationId, address: recoveredAddress },
			"Signature received"
		);
		return recoveredAddress;
	} catch (error: any) {
		logger.error(
			{ error: error.message, verificationId },
			"Error recovering address from signature."
		);
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
 *     operationId: verifySignature
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
router.post(
	"/verify",
	validateVerification,
	async (req: Request, res: Response) => {
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

			// Step 1: Handle signature recovery and initial update (sets wallet address)
			const recoveredAddress = await _handleSignatureRecovery(
				verificationId,
				signature as Hex
			);
			logger.debug(
				{ verificationId, recoveredAddress },
				"Address recovered from signature"
			);

			// Step 2: Handle scoring (checks score against minimum)
			const { score, verified } = await _handleScoring(
				verificationId,
				recoveredAddress
			);
			logger.info({ verificationId, score, verified }, "Score fetched");

			// Step 3: Attempt role assignment/removal based on score
			let roleAssignmentSucceeded = false;
			// Initialize with existing role, handling potential undefined
			let finalDbRole: string | null = user.role ?? null;
			let discordUpdateMessage = "";
			let discordEmbedColor = 0xffcc00; // Default: Yellow (Partial/Error)
			const minScore = parseInt(process.env.MINIMUM_SCORE || "0");

			try {
				// Call role assignment - it returns true on success, false on failure.
				const discordUpdateSuccess = await _handleRoleAssignment(
					verificationId,
					user.discordUserId,
					score
				);

				roleAssignmentSucceeded = discordUpdateSuccess; // Store the direct result

				if (discordUpdateSuccess) {
					// Determine the intended DB role *only if* Discord update succeeded
					if (verified) {
						// Score was sufficient - Assign standard verified role
						finalDbRole = "verified_human";
						discordUpdateMessage =
							"Verification successful. Role assigned/updated.";
						discordEmbedColor = 0x00ff00; // Green
					} else {
						// Score was insufficient, role should be removed/defaulted
						finalDbRole = null; // Or your default non-verified role name
						discordUpdateMessage =
							"Score insufficient. Verified role removed if previously held.";
						discordEmbedColor = 0xff0000; // Red
					}
				} else {
					// Discord update failed - Keep original DB role
					// finalDbRole remains user.role ?? null
					discordUpdateMessage =
						"Could not update Discord roles. Please contact an admin.";
					discordEmbedColor = 0xffcc00; // Yellow for error
				}
			} catch (roleError: any) {
				// Catch errors specifically from _handleRoleAssignment itself (shouldn't happen based on its code, but good practice)
				logger.error(
					{
						error: roleError,
						discordUserId: user.discordUserId,
						verificationId,
					},
					"Unexpected error calling _handleRoleAssignment"
				);
				roleAssignmentSucceeded = false;
				// Keep original DB role
				discordUpdateMessage =
					"An unexpected error occurred during role update. Please contact an admin.";
				discordEmbedColor = 0xffcc00; // Yellow for error
			}

			// Send interaction reply update to Discord
			const interactionToken = user.humanPassport?.interactionToken;
			if (interactionToken) {
				try {
					let finalEmbed = new EmbedBuilder()
						.setTitle("Human Passport Verification Status")
						.setColor(discordEmbedColor)
						.addFields(
							{ name: "Status", value: discordUpdateMessage },
							{ name: "Your Score", value: score.toString() },
							{
								name: "Minimum Required",
								value: minScore.toString(),
							}
						)
						.setFooter({ text: "You can dismiss this message." });

					await discordService.editInteractionReply(
						interactionToken,
						{
							embeds: [finalEmbed],
							components: [], // Remove the button
						}
					);
				} catch (replyError) {
					logger.error(
						{ error: replyError, verificationId },
						"Error updating Discord interaction reply"
					);
				}
			}

			// Step 4: Update user record in DB
			const finalStatus = verified
				? VERIFICATION_STATUS.VERIFIED // Score sufficient
				: VERIFICATION_STATUS.NOT_VERIFIED; // Score insufficient
			const humanPassport: HumanPassport = {
				...(user.humanPassport || {}),
				status: finalStatus,
				score: score,
				lastVerificationTime: Date.now(),
				verificationId: verificationId, // Ensure verificationId is persisted
			};

			await extendedDynamoDB.updateUser(user.discordUserId, {
				humanPassport,
				walletAddress: recoveredAddress, // Ensure wallet is updated
				role: finalDbRole, // Use the role determined by assignment success
				updatedAt: Date.now(),
			});

			logger.info(
				{
					verificationId,
					status: finalStatus,
					roleAssigned: roleAssignmentSucceeded,
					finalDbRole: finalDbRole,
				},
				"Verification process complete."
			);

			// Step 5: Return final result to client
			// Construct user-facing message based on verification and role status
			let clientMessage = "";
			if (verified) {
				clientMessage = roleAssignmentSucceeded
					? "Verification successful. Roles assigned/updated."
					: "Verification successful, but failed to update Discord roles. Please contact admin.";
			} else {
				clientMessage = roleAssignmentSucceeded
					? "Verification failed: Score too low. Roles removed if previously held."
					: "Verification failed: Score too low. Also failed to update Discord roles. Please contact admin.";
			}

			return res.status(200).json({
				success: true, // API call succeeded
				verified: verified, // Score met threshold
				score: score,
				roleAssigned: roleAssignmentSucceeded, // Discord update succeeded
				address: recoveredAddress,
				status: finalStatus, // Overall verification status (based on score)
				message: clientMessage,
				minimumRequiredScore: minScore,
			});
		} catch (error: any) {
			// Handle errors from signature recovery, scoring, or DB updates
			const verificationId =
				req.verificationId ||
				req.query.verificationId ||
				req.body.verificationId ||
				"unknown";
			logger.error(
				{ error: error.message, path: req.path, verificationId },
				"Error in /verify route"
			);

			return res.status(500).json({
				success: false,
				error: error.message || "Server error during verification",
				status: VERIFICATION_STATUS.NOT_VERIFIED,
			});
		}
	}
);

/**
 * @swagger
 * /api/human/status/discord/{discordUserId}:
 *   get:
 *     summary: Check verification status by Discord user ID
 *     description: Check the human verification status of a user by their Discord ID
 *     tags: [Human]
 *     operationId: getStatusByDiscordId
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
router.get(
	"/status/discord/:discordUserId",
	async (req: Request, res: Response) => {
		try {
			const { discordUserId } = req.params;

			if (!discordUserId) {
				return res.status(400).json({
					success: false,
					error: "Missing discordUserId parameter",
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
				verified: humanPassport.status === VERIFICATION_STATUS.VERIFIED,
				roleAssigned: user.role === "verified_human",
				score: humanPassport.score,
				status: humanPassport.status, // Return the current verification status
				minimumRequiredScore: parseInt(
					process.env.MINIMUM_SCORE || "0"
				),
				lastChecked: new Date().toISOString(),
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
	}
);

/**
 * @swagger
 * /api/human/status/verification/{verificationId}:
 *   get:
 *     summary: Check verification status by verification ID
 *     description: Check the human verification status of a user by their verification ID
 *     tags: [Human]
 *     operationId: getStatusByVerificationId
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
router.get(
	"/status/verification/:verificationId",
	async (req: Request, res: Response) => {
		try {
			const { verificationId } = req.params;

			if (!verificationId) {
				return res.status(400).json({
					success: false,
					error: "Missing verificationId parameter",
				});
			}

			// Get user directly
			const user = await extendedDynamoDB.getUserByVerificationId(
				verificationId
			);

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
				verified: humanPassport.status === VERIFICATION_STATUS.VERIFIED,
				roleAssigned: user.role === "verified_human",
				score: humanPassport.score,
				status: humanPassport.status, // Return the current verification status
				minimumRequiredScore: parseInt(
					process.env.MINIMUM_SCORE || "0"
				),
				lastChecked: new Date().toISOString(),
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
	}
);

/**
 * @swagger
 * /api/human/score:
 *   get:
 *     summary: Get passport score for a given address and verification
 *     description: Fetches the Gitcoin Passport score for the wallet address associated with a verification ID
 *     tags: [Human]
 *     operationId: getScore
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

	if (
		!verificationId ||
		!providedAddress ||
		typeof verificationId !== "string" ||
		typeof providedAddress !== "string"
	) {
		return res.status(400).json({
			success: false,
			error: "Missing or invalid 'verificationId' or 'address' query parameters",
		});
	}

	// Use the address provided directly from the frontend query for this pre-check
	const addressToCheck = providedAddress as Hex;

	try {
		// Check if there's a user with this verification ID
		const user = await extendedDynamoDB.getUserByVerificationId(
			verificationId
		);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, error: "User not found" });
		}

		// Get score from passport service
		logger.info(
			{ verificationId, address: addressToCheck },
			"Fetching score for provided address (pre-signature check)..."
		);
		const scoreResponse = await passportService.getScore(addressToCheck);
		const minimumScore = parseFloat(process.env.MINIMUM_SCORE || "0");

		if (!scoreResponse || typeof scoreResponse.score === "undefined") {
			logger.error(
				{ verificationId, address: addressToCheck },
				"Failed to retrieve passport score or score was undefined."
			);
			// Don't update user status here, just report error to frontend
			return res.status(500).json({
				success: false,
				error: "Failed to retrieve passport score.",
			});
		}

		const score = parseFloat(scoreResponse.score);
		if (isNaN(score)) {
			logger.error(
				{ verificationId, address: addressToCheck, scoreResponse },
				"Invalid score format received during score check."
			);
			return res.status(500).json({
				success: false,
				error: "Invalid score format received.",
			});
		}

		const isSufficient = score >= minimumScore;

		// No user update needed here, just returning the check result
		logger.info(
			{
				verificationId,
				address: addressToCheck,
				score,
				minimumScore,
				isSufficient,
			},
			"Pre-signature score check completed."
		);

		return res.status(200).json({
			success: isSufficient, // Success means score is sufficient
			score: score,
			user: {
				discordUserId: user.discordUserId,
				walletAddress: user.walletAddress,
				humanPassport: user.humanPassport,
			},
			minimumScore: minimumScore, // Return minimum score for context
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message, verificationId, address: addressToCheck },
			"Error during GET /score processing."
		);
		return res.status(500).json({
			success: false,
			error: "Server error during score check.",
		});
	}
});

export default router;

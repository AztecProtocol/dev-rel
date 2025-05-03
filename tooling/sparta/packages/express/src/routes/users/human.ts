/**
 * @fileoverview API routes for Human Passport verification (within Discord Bot)
 * @description Express routes for handling wallet verification with Human Passport
 * @module sparta/express/routes/human
 */

import express, { type Request, type Response } from "express";
import { PassportService } from "../../domain/humanPassport/service.js";
import { logger } from "@sparta/utils/index.js";
import { recoverMessageAddress, type Hex } from "viem";
import type { HumanPassport } from "./users.js";
import { VERIFICATION_MESSAGE } from "@sparta/utils/const/verificationStatus.js"; // Import status constants
import { EmbedBuilder } from "discord.js";
import { DiscordService } from "@sparta/discord/src/services/discord-service.js";
import { userRepository } from "../../db/userRepository.js";
import { validateVerification } from "../../middlewares/humanPassport.js";
import { _handleScoring } from "../../domain/humanPassport/utils.js";
import { type Role } from "@sparta/utils/const/roles.js";
import { _handleUserRolesAssignment } from "packages/discord/src/utils/roleAssigner.js";

// Define shared schemas
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *       description: API key for authenticating requests
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
 *     StampsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: True if the operation completed successfully.
 *         stamps:
 *           type: array
 *           description: Array of Gitcoin Passport stamps associated with the wallet.
 *           items:
 *             type: object
 *         user:
 *           type: object
 *           properties:
 *             discordUserId:
 *               type: string
 *               description: The Discord user ID.
 *             walletAddress:
 *               type: string
 *               description: The user's wallet address.
 *             humanPassport:
 *               type: object
 *               description: Human passport verification data.
 *       required:
 *         - success
 *         - stamps
 *         - user
 */

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
		const user = await userRepository.getUserByVerificationId(
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
 * /api/users/human/verify:
 *   post:
 *     summary: Verify a wallet signature
 *     description: Verify a wallet signature and process Passport verification
 *     tags: [Users]
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
			const { newRoles, passportData } = await _handleScoring(
				verificationId,
				recoveredAddress
			);
			logger.info(
				{ verificationId, newRoles },
				"Human passport data fetched"
			);

			// Step 3: Attempt role assignment/removal based on score
			let roleAssignmentSucceeded = false;
			// Initialize with existing role, handling potential undefined
			let finalDbRoles: Role[] | null = user.roles ?? null;
			let discordUpdateMessage = "";
			let discordEmbedColor = 0xffcc00; // Default: Yellow (Partial/Error)

			try {
				// Call role assignment - it returns true on success, false on failure.
				const discordUpdateSuccess = await _handleUserRolesAssignment(
					verificationId,
					user.discordUserId,
					newRoles
				);

				roleAssignmentSucceeded = discordUpdateSuccess; // Store the direct result

				if (discordUpdateSuccess) {
					// Determine the intended DB role *only if* Discord update succeeded
					if (newRoles.length > 0) {
						// Score was sufficient - Assign standard verified role
						finalDbRoles?.push(...newRoles);
						discordUpdateMessage =
							"Verification successful. Role assigned/updated.";
						discordEmbedColor = 0x00ff00; // Green
					} else {
						// Score was insufficient, role should be removed/defaulted
						discordUpdateMessage =
							"Score insufficient. No roles have been assigned.";
						discordEmbedColor = 0xff0000; // Red
					}
				} else {
					// Discord update failed - Keep original DB role
					// finalDbRole remains user.role ?? null
					discordUpdateMessage =
						"Could not update Discord roles. Please contact a moderator.";
					discordEmbedColor = 0xffcc00; // Yellow for error
				}
			} catch (roleError: any) {
				// Catch errors specifically from _handleUserRoleAssignment itself (shouldn't happen based on its code, but good practice)
				logger.error(
					{
						error: roleError,
						discordUserId: user.discordUserId,
						verificationId,
					},
					"Unexpected error calling _handleUserRoleAssignment"
				);
				roleAssignmentSucceeded = false;
				// Keep original DB role
				discordUpdateMessage =
					"An unexpected error occurred during role update. Please contact a moderator.";
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
							{
								name: "New Roles",
								value: newRoles
									.map((role) => role.name)
									.join(", "),
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

			const humanPassport: HumanPassport = {
				...(user.humanPassport || {}),
				passportData: passportData,
				lastVerificationTime: Date.now(),
				verificationId: verificationId, // Ensure verificationId is persisted
			};

			await userRepository.updateUser(user.discordUserId, {
				humanPassport,
				walletAddress: recoveredAddress, // Ensure wallet is updated
				roles: finalDbRoles, // Use the role determined by assignment success
				updatedAt: Date.now(),
			});

			logger.info(
				{
					discordUserId: user.discordUserId,
					discordUsername: user.discordUsername,
					walletAddress: recoveredAddress,
					verificationId,
					passportData: passportData,
					roleAssigned: roleAssignmentSucceeded,
					finalDbRoles: finalDbRoles,
				},
				"Verification process complete."
			);

			return res.status(200).json({
				success: true, // API call succeeded
				roleAssigned: roleAssignmentSucceeded, // Discord update succeeded
				newRoles: newRoles,
				address: recoveredAddress,
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
			});
		}
	}
);

/**
 * @swagger
 * /api/users/human/stamps:
 *   get:
 *     summary: Get passport stamps for a given address and verification
 *     description: Fetches the Gitcoin Passport stamps for the wallet address associated with a verification ID
 *     tags: [Users]
 *     operationId: getStamps
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
 *         description: Stamps retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StampsResponse'
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
router.get("/stamps", async (req: Request, res: Response) => {
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
		const user = await userRepository.getUserByVerificationId(
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
			"Fetching stamps for provided address (pre-signature check)..."
		);

		const { passportData } = await _handleScoring(
			verificationId,
			addressToCheck
		);

		if (!passportData) {
			return res.status(404).json({
				success: false,
				error: "No passport data found for provided address",
			});
		}

		const stamps = passportData.stamps;

		// No user update needed here, just returning the check result
		logger.info(
			{
				verificationId,
				address: addressToCheck,
				stamps,
			},
			"Pre-signature stamps check completed."
		);

		return res.status(200).json({
			success: true,
			stamps,
			user: {
				discordUserId: user.discordUserId,
				walletAddress: user.walletAddress,
				humanPassport: user.humanPassport,
			},
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

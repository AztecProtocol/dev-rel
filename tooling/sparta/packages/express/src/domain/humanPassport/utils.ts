import { extendedDynamoDB } from "@sparta/express/db/userRepository";
import { PassportService } from "./service";
import { logger } from "@sparta/utils/logger";
import { VERIFICATION_STATUS } from "@sparta/utils/const.js";
import type { Hex } from "viem";
import type { HumanPassport } from "@sparta/express/routes/users";

interface ScoringResult {
	score: number;
	verified: boolean;
	lastScoreTimestamp: number;
}

const passportService = PassportService.getInstance();

/**
 * Updates a user's verification status
 */
export async function _updateUserVerificationStatus(
	verificationId: string,
	status: string
): Promise<boolean> {
	try {
		const user = await extendedDynamoDB.getUserByVerificationId(
			verificationId
		);
		if (!user) {
			logger.error(
				{ verificationId },
				"Could not find user to update verification status"
			);
			return false;
		}

		// Create or update humanPassport object
		const humanPassport: HumanPassport = {
			...(user.humanPassport || {}),
			status: status,
		};

		await extendedDynamoDB.updateUser(user.discordUserId, {
			humanPassport,
			updatedAt: Date.now(),
		});
		return true;
	} catch (error: any) {
		logger.error(
			{ error: error.message, verificationId },
			"Error updating user verification status"
		);
		return false;
	}
}

/**
 * Gets passport score, updates user, and determines verification status.
 * Throws error if scoring fails.
 */
export async function _handleScoring(
	verificationId: string,
	address: Hex
): Promise<ScoringResult> {
	const scoreResponse = await passportService.getScore(address);

	if (!scoreResponse) {
		logger.error(
			{ verificationId, address },
			"Failed to retrieve passport score."
		);
		// Update the user with error status
		await _updateUserVerificationStatus(
			verificationId,
			VERIFICATION_STATUS.NOT_VERIFIED
		);
		throw new Error("Failed to retrieve passport score.");
	}

	// Basic validation/parsing (consider more robust parsing if needed)
	const score = parseFloat(scoreResponse.score);
	if (isNaN(score)) {
		logger.error(
			{ verificationId, address, scoreResponse },
			"Invalid score format received."
		);
		await _updateUserVerificationStatus(
			verificationId,
			VERIFICATION_STATUS.NOT_VERIFIED
		);
		throw new Error("Invalid score format received from passport service.");
	}

	const lastScoreTimestamp = scoreResponse.last_score_timestamp
		? new Date(scoreResponse.last_score_timestamp).getTime()
		: Date.now();

	const verified = score >= parseFloat(process.env.MINIMUM_SCORE || "0");

	// Find and update the user
	const user = await extendedDynamoDB.getUserByVerificationId(verificationId);
	if (user) {
		// Create or update humanPassport object
		const humanPassport: HumanPassport = {
			...(user.humanPassport || {}),
			status: VERIFICATION_STATUS.VERIFIED,
			score: score,
			lastVerificationTime: lastScoreTimestamp,
		};

		await extendedDynamoDB.updateUser(user.discordUserId, {
			humanPassport,
			updatedAt: Date.now(),
		});
	}

	logger.info(
		{ verificationId, address, score, verified },
		"Passport score retrieved."
	);
	return { score, verified, lastScoreTimestamp };
}

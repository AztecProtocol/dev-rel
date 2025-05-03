import { PassportService, type PassportResponse } from "./service";
import { logger } from "@sparta/utils/logger";
import type { Hex } from "viem";
import {
	DEVELOPER_ROLES,
	USER_ROLES,
	type Role,
} from "@sparta/utils/const/roles";

interface ScoringResult {
	newRoles: Role[];
	lastScoreTimestamp: number;
	passportData: PassportResponse;
}

const passportService = PassportService.getInstance();

/**
 * Gets passport score, updates user, and determines verification status depending on the supplied role.
 * Throws error if scoring fails.
 */
export async function _handleScoring(
	verificationId: string,
	address: Hex
): Promise<ScoringResult> {
	const humanPassportData = await passportService.getHumanPassportData(
		address
	);

	if (!humanPassportData) {
		logger.error(
			{ verificationId, address },
			"Failed to retrieve passport data."
		);
		throw new Error("Failed to retrieve passport data.");
	}

	const lastScoreTimestamp = humanPassportData.last_score_timestamp
		? new Date(humanPassportData.last_score_timestamp).getTime()
		: Date.now();

	const { score, stamps } = humanPassportData;
	const newRoles: Role[] = [];

	// Currently not giving human roles based on Human Passport to Node Operators
	// for (const role of Object.values(NODE_OPERATOR_ROLES)) {
	// }

	// Currently only giving human roles based on Human Passport to Developers
	for (const role of Object.values(USER_ROLES)) {
		// if (stamps?.["githubContributionActivityGte#30"]?.expiration_date) {
		// 	const githubExpirationDate = new Date(
		// 		stamps?.["githubContributionActivityGte#30"]?.expiration_date
		// 	);

		// 	if (githubExpirationDate > new Date()) {
		// 		newRoles.push(role);
		// 	}
		// }

		if (Number(score) >= 10) {
			newRoles.push(role);
		}
	}

	logger.info(
		{ verificationId, address, score, newRoles },
		"Passport score retrieved."
	);
	return { newRoles, passportData: humanPassportData, lastScoreTimestamp };
}

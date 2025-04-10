/**
 * @fileoverview Google Sheets service for integration with Discord
 * @description Provides methods to monitor Google Sheets and assign Discord roles based on sheet data
 * @module sparta/services/googlesheet-service
 */

import { GoogleSheet, googleSheet } from "../clients/google.js";
import { discordService } from "./discord-service.js";

/**
 * Service for integrating with Google Sheets and assigning Discord roles based on sheet data
 *
 * This service:
 * - Monitors specific columns in Google Sheets
 * - Detects changes to user scores
 * - Assigns Discord roles based on score thresholds
 *
 * @example
 * // Create an instance and watch a sheet
 * const service = new GoogleSheetService();
 * service.watchColumn("Sheet1", "A:B");
 */
export class GoogleSheetService {
	/**
	 * Watches specified columns in a Google Sheet for changes
	 *
	 * This method sets up a watch on column A (scores) and column B (Discord usernames).
	 * When changes are detected, it triggers the role assignment process if both
	 * a score and username are present.
	 *
	 * @param {string} sheetName - The name of the sheet to watch (e.g., "Sheet1")
	 * @param {string} range - The range of cells to watch (e.g., "A:B")
	 *
	 * @example
	 * // Watch columns A and B in Sheet1
	 * googleSheetService.watchColumn("Sheet1", "A:B");
	 */
	watchColumn(sheetName: string, range: string) {
		// Watch both columns A and B at the same time
		googleSheet.watchColumns(
			`${sheetName}!${range}`,
			[0, 1], // Watch columns A (index 0) and B (index 1)
			(changedColumnIndex, newValue, oldValue, row, rowData) => {
				const columnLetter = changedColumnIndex === 0 ? "A" : "B";
				console.log(
					`Cell ${columnLetter}${
						row + 2
					} changed from ${oldValue} to ${newValue}`
				);

				// Only execute if both columns have values
				const scoreValue = rowData[0];
				const discordUsername = rowData[1];

				if (scoreValue && discordUsername) {
					// Handle the promise without blocking
					this.assignRoleBasedOnScore(
						scoreValue,
						discordUsername,
						row
					).catch((error) => {
						console.error(
							"Error in role assignment process:",
							error
						);
					});
				}
			}
		);
	}

	/**
	 * Assigns a Discord role based on a user's score
	 *
	 * This method:
	 * 1. Validates and parses the score
	 * 2. Finds the Discord user ID by username
	 * 3. Determines the appropriate role based on score thresholds:
	 *    - Score > 10: "Sentinel" (highest role)
	 *    - Score > 5: "Defender" (middle role)
	 *    - Default: "Guardian" (lowest role)
	 * 4. Assigns the role to the user
	 *
	 * @param {string} scoreString - The user's score as a string (will be converted to number)
	 * @param {string} discordUsername - The Discord username to assign the role to
	 * @param {number} row - The row number in the spreadsheet (for logging purposes)
	 * @returns {Promise<void>} A promise that resolves when the role assignment is complete
	 *
	 * @private
	 */
	private async assignRoleBasedOnScore(
		scoreString: string,
		discordUsername: string,
		row: number
	): Promise<void> {
		console.log(`Processing role assignment for row ${row + 2}`);
		console.log(
			`Score: ${scoreString}, Discord Username: ${discordUsername}`
		);

		// Parse score as a number
		const score = Number(scoreString);

		// Validate score is a number
		if (isNaN(score)) {
			console.error(
				`Invalid score value: ${scoreString}, expected a number`
			);
			return;
		}

		console.log(`Finding Discord ID for username: ${discordUsername}`);
		// Find the Discord ID by username
		const discordUserId = await discordService.findUserIdByUsername(
			discordUsername
		);

		console.log(`Discord ID found: ${discordUserId}`);

		if (!discordUserId) {
			console.error(
				`Could not find Discord user with username: ${discordUsername}`
			);
			return;
		}

		// Determine role based on score threshold using the hierarchy:
		// Guardian (lowest) -> Defender -> Sentinel (highest)
		let roleName = "Guardian"; // Default/lowest role

		if (score > 10) {
			roleName = "Sentinel"; // Highest role
		} else if (score > 5) {
			roleName = "Defender"; // Middle role
		}

		// Assign the appropriate role to the Discord user
		try {
			const success = await discordService.assignRole(
				discordUserId,
				roleName
			);

			if (success) {
				console.log(
					`Successfully assigned role ${roleName} to user ${discordUsername} (ID: ${discordUserId})`
				);
			} else {
				console.error(
					`Failed to assign role ${roleName} to user ${discordUsername} (ID: ${discordUserId})`
				);
			}
		} catch (error) {
			console.error(
				`Error assigning role ${roleName} to user ${discordUsername} (ID: ${discordUserId}):`,
				error
			);
		}
	}
}

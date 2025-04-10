import { GoogleSheet, googleSheet } from "../clients/google.js";
import { discordService } from "./discord-service.js";

export class GoogleSheetService {
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
	 * @param scoreString The user's score as a string (will be converted to number)
	 * @param discordUsername The Discord username to assign the role to
	 * @param row The row number in the spreadsheet (for logging purposes)
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

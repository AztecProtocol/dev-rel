import { sheets, sheets_v4 } from "@googleapis/sheets";
import { logger } from "../utils/logger.js";

export class GoogleSheet {
	private sheets: sheets_v4.Sheets;
	private watchInterval: NodeJS.Timer | null = null;
	private lastValues: Record<string, any> = {};
	private spreadsheetId: string;

	/**
	 * Create a new GoogleSheetService
	 * @param apiKey Google API key
	 */
	constructor(spreadsheetId: string) {
		logger.info("Initializing GoogleSheetService");
		this.spreadsheetId = spreadsheetId;
		if (!process.env.GOOGLE_API_KEY) {
			logger.error("GOOGLE_API_KEY environment variable is required");
			process.exit(1);
		}
		this.sheets = sheets({
			version: "v4",
			auth: process.env.GOOGLE_API_KEY,
		});
	}

	/**
	 * Start watching a specific sheet for changes
	 * @param spreadsheetId The ID of the spreadsheet
	 * @param sheetRange The A1 notation of the range to watch
	 * @param columnIndex The index of the column to watch for changes (0-based)
	 * @param callback Function to call when changes are detected
	 * @param intervalMs How often to check for changes (in milliseconds)
	 */
	public watchColumn(
		sheetRange: string,
		columnIndex: number,
		callback: (
			newValue: any,
			oldValue: any,
			row: number,
			rowData: any[]
		) => void,
		intervalMs: number = 10000
	): void {
		logger.info(
			{ columnIndex, sheetRange, intervalMs },
			"Watching column for changes"
		);
		// Initial fetch to establish baseline
		this.fetchData(this.spreadsheetId, sheetRange)
			.then((data) => {
				// Store initial values
				data.forEach((row, rowIndex) => {
					if (row && row[columnIndex] !== undefined) {
						const key = `${rowIndex}-${columnIndex}`;
						this.lastValues[key] = row[columnIndex];
					}
				});

				// Start watching for changes
				this.watchInterval = setInterval(async () => {
					try {
						const newData = await this.fetchData(
							this.spreadsheetId,
							sheetRange
						);

						// Check for changes
						newData.forEach((row, rowIndex) => {
							if (row && row[columnIndex] !== undefined) {
								const key = `${rowIndex}-${columnIndex}`;
								const newValue = row[columnIndex];
								const oldValue = this.lastValues[key];

								// If value has changed, trigger callback
								if (newValue !== oldValue) {
									callback(newValue, oldValue, rowIndex, row);
									this.lastValues[key] = newValue;
								}
							}
						});
					} catch (error) {
						logger.error({ error }, "Error checking for updates");
					}
				}, intervalMs);
			})
			.catch((error) => {
				logger.error({ error }, "Error initializing sheet watcher");
			});
	}

	/**
	 * Watch multiple columns for changes and execute callback when changes are detected in any watched column
	 * @param sheetRange The A1 notation of the range to watch
	 * @param columnIndexes Array of column indexes to watch (0-based)
	 * @param callback Function to call when changes are detected
	 * @param intervalMs How often to check for changes (in milliseconds)
	 */
	public watchColumns(
		sheetRange: string,
		columnIndexes: number[],
		callback: (
			changedColumnIndex: number,
			newValue: any,
			oldValue: any,
			row: number,
			rowData: any[]
		) => void,
		intervalMs: number = 1000
	): void {
		logger.info(
			{ columnIndexes, sheetRange, intervalMs },
			"Watching multiple columns for changes"
		);

		// Initial fetch to establish baseline
		this.fetchData(this.spreadsheetId, sheetRange)
			.then((data) => {
				// Store initial values for all specified columns
				data.forEach((row, rowIndex) => {
					if (row) {
						columnIndexes.forEach((colIndex) => {
							if (row[colIndex] !== undefined) {
								const key = `${rowIndex}-${colIndex}`;
								this.lastValues[key] = row[colIndex];
							}
						});
					}
				});

				// Start watching for changes
				this.watchInterval = setInterval(async () => {
					try {
						const newData = await this.fetchData(
							this.spreadsheetId,
							sheetRange
						);

						// Check for changes in any of the watched columns
						newData.forEach((row, rowIndex) => {
							if (row) {
								columnIndexes.forEach((colIndex) => {
									if (row[colIndex] !== undefined) {
										const key = `${rowIndex}-${colIndex}`;
										const newValue = row[colIndex];
										const oldValue = this.lastValues[key];

										// If value has changed, trigger callback
										if (newValue !== oldValue) {
											callback(
												colIndex,
												newValue,
												oldValue,
												rowIndex,
												row
											);
											this.lastValues[key] = newValue;
										}
									}
								});
							}
						});
					} catch (error) {
						logger.error({ error }, "Error checking for updates");
					}
				}, intervalMs);
			})
			.catch((error) => {
				logger.error({ error }, "Error initializing sheet watcher");
			});
	}

	/**
	 * Stop watching the spreadsheet
	 */
	public stopWatching(): void {
		if (this.watchInterval) {
			clearInterval(this.watchInterval);
			this.watchInterval = null;
			logger.info("Stopped watching spreadsheet");
		}
	}

	/**
	 * Fetch data from the spreadsheet
	 * @param spreadsheetId The ID of the spreadsheet
	 * @param range The A1 notation of the range to fetch
	 */
	private async fetchData(
		spreadsheetId: string,
		range: string
	): Promise<any[][]> {
		try {
			logger.debug({ spreadsheetId, range }, "Fetching sheet data");
			const response = await this.sheets.spreadsheets.values.get({
				spreadsheetId,
				range,
			});

			return response.data.values || [];
		} catch (error) {
			logger.error(
				{ error, spreadsheetId, range },
				"Error fetching sheet data"
			);
			throw error;
		}
	}

	/**
	 * Fetch a specific cell value from the spreadsheet
	 * @param spreadsheetId The ID of the spreadsheet
	 * @param cellRange The A1 notation of the cell to fetch (e.g., "Sheet1!B2")
	 * @returns The value of the specified cell
	 */
	public async fetchCellValue(
		spreadsheetId: string,
		cellRange: string
	): Promise<any> {
		try {
			logger.debug({ spreadsheetId, cellRange }, "Fetching cell value");
			const response = await this.sheets.spreadsheets.values.get({
				spreadsheetId,
				range: cellRange,
			});

			const values = response.data.values;
			if (!values || values.length === 0) {
				logger.debug({ cellRange }, "Cell value is null");
				return null;
			}

			// When fetching a single cell, sheets API returns a 2D array with just that cell
			// Get the value directly
			return values[0][0];
		} catch (error) {
			logger.error(
				{ error, spreadsheetId, cellRange },
				"Error fetching cell"
			);
			throw error;
		}
	}

	/**
	 * Convert a column letter (A, B, C, ..., Z, AA, AB, ...) to a zero-based column index
	 * @param column The column letter(s)
	 * @returns The zero-based index
	 */
	private columnLetterToIndex(column: string): number {
		let index = 0;
		for (let i = 0; i < column.length; i++) {
			index = index * 26 + column.charCodeAt(i) - 64; // 'A' is ASCII 65
		}
		return index - 1; // Convert to 0-based index
	}

	/**
	 * Update data in the spreadsheet
	 * @param spreadsheetId The ID of the spreadsheet
	 * @param range The A1 notation of the range to update
	 * @param values The values to write
	 */
	public async updateValues(
		spreadsheetId: string,
		range: string,
		values: any[][]
	): Promise<void> {
		try {
			logger.debug({ spreadsheetId, range }, "Updating sheet data");
			await this.sheets.spreadsheets.values.update({
				spreadsheetId,
				range,
				valueInputOption: "USER_ENTERED",
				requestBody: {
					values,
				},
			});
			logger.info({ range }, "Successfully updated sheet data");
		} catch (error) {
			logger.error(
				{ error, spreadsheetId, range },
				"Error updating sheet data"
			);
			throw error;
		}
	}
}

export const googleSheet = new GoogleSheet(
	process.env.SPREADSHEET_ID as string
);

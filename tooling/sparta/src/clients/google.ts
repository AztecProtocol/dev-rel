import { sheets, sheets_v4 } from "@googleapis/sheets";

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
		console.log("Initializing GoogleSheetService");
		this.spreadsheetId = spreadsheetId;
		if (!process.env.GOOGLE_API_KEY) {
			console.error("GOOGLE_API_KEY environment variable is required");
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
		console.log("Watching column", columnIndex, "in sheet", sheetRange);
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
						console.error("Error checking for updates:", error);
					}
				}, intervalMs);
			})
			.catch((error) => {
				console.error("Error initializing sheet watcher:", error);
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
		console.log(
			"Watching columns",
			columnIndexes.join(", "),
			"in sheet",
			sheetRange
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
						console.error("Error checking for updates:", error);
					}
				}, intervalMs);
			})
			.catch((error) => {
				console.error("Error initializing sheet watcher:", error);
			});
	}

	/**
	 * Stop watching the spreadsheet
	 */
	public stopWatching(): void {
		if (this.watchInterval) {
			clearInterval(this.watchInterval);
			this.watchInterval = null;
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
			const response = await this.sheets.spreadsheets.values.get({
				spreadsheetId,
				range,
			});

			return response.data.values || [];
		} catch (error) {
			console.error("Error fetching sheet data:", error);
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
			const response = await this.sheets.spreadsheets.values.get({
				spreadsheetId,
				range: cellRange,
			});

			const values = response.data.values;
			if (!values || values.length === 0 || values[0].length === 0) {
				return null;
			}

			return values[0][0]; // Return the value of the requested cell
		} catch (error) {
			console.error(`Error fetching cell ${cellRange}:`, error);
			throw error;
		}
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
			await this.sheets.spreadsheets.values.update({
				spreadsheetId,
				range,
				valueInputOption: "USER_ENTERED",
				requestBody: {
					values,
				},
			});
		} catch (error) {
			console.error("Error updating sheet data:", error);
			throw error;
		}
	}
}

export const googleSheet = new GoogleSheet(
	process.env.SPREADSHEET_ID as string
);

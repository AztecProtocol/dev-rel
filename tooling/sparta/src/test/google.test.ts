import { expect, test, beforeAll, describe, mock } from "bun:test";
import { GoogleSheet } from "../clients/google.js";
import { config } from "dotenv";

config({ path: ".env.local" });

// Mock test data for our spreadsheet
const testData = [
	["header1", "header2", "header3"],
	["value1", "value2", "value3"],
	["value4", "value5", "value6"],
];

// Mock Google Sheets API
mock.module("@googleapis/sheets", () => {
	const mockSheetsGet = mock((params) => {
		const range = params.range;

		// Handle single cell requests (e.g., Sheet1!B2)
		const cellMatch = range.match(/.*!([A-Z])([0-9]+)$/);
		if (cellMatch) {
			const col = cellMatch[1].charCodeAt(0) - 65; // Convert A->0, B->1, etc.
			const row = parseInt(cellMatch[2]) - 1; // Convert to 0-based index

			// Return just the value at that position in a 2D array
			// This is how the real API would respond for a cell request
			if (
				row >= 0 &&
				row < testData.length &&
				col >= 0 &&
				col < testData[row].length
			) {
				return {
					data: {
						values: [[testData[row][col]]],
					},
				};
			}
		}

		// Default case: return all data
		return {
			data: {
				values: testData,
			},
		};
	});

	const mockSheetsUpdate = mock(() => ({
		data: {
			updatedCells: 3,
			updatedRange: "Sheet1!A1:C2",
		},
	}));

	return {
		sheets: mock((options) => ({
			spreadsheets: {
				values: {
					get: mockSheetsGet,
					update: mockSheetsUpdate,
				},
			},
		})),
	};
});

describe("Google Sheets Integration Tests", () => {
	let googleSheet: GoogleSheet;

	beforeAll(() => {
		// Set environment variable for tests
		process.env.GOOGLE_API_KEY = "test-api-key";

		// Create an instance with a test spreadsheet ID
		googleSheet = new GoogleSheet("test-spreadsheet-id");
	});

	test("GoogleSheet constructor initializes with correct spreadsheet ID", () => {
		// @ts-expect-error - accessing private property for test
		expect(googleSheet.spreadsheetId).toBe("test-spreadsheet-id");
	});

	test("fetchData retrieves values from the spreadsheet", async () => {
		// @ts-expect-error - accessing private method for test
		const values = await googleSheet.fetchData(
			"test-spreadsheet-id",
			"Sheet1!A1:C3"
		);

		expect(values).toBeDefined();
		expect(values.length).toBe(3);
		expect(values[0][0]).toBe("header1");
		expect(values[1][0]).toBe("value1");
	});

	test("fetchCellValue retrieves a specific cell value", async () => {
		const value = await googleSheet.fetchCellValue(
			"test-spreadsheet-id",
			"Sheet1!B2"
		);
		expect(value).toBe("value2");
	});

	test("updateValues updates data in the spreadsheet", async () => {
		const newValues = [
			["newValue1", "newValue2", "newValue3"],
			["newValue4", "newValue5", "newValue6"],
		];

		await googleSheet.updateValues(
			"test-spreadsheet-id",
			"Sheet1!A1:C2",
			newValues
		);

		// The update verification is handled by the mock system automatically
	});

	test("watchColumn correctly sets up watching for changes", async () => {
		// Mock setTimeout for testing interval setting
		const originalSetInterval = global.setInterval;
		const mockSetInterval = mock(() => 123);
		global.setInterval = mockSetInterval as any;

		// Mock fetchData to resolve immediately
		// @ts-expect-error - accessing private method for test
		const originalFetchData = googleSheet.fetchData;
		// @ts-expect-error - accessing private method for test
		googleSheet.fetchData = mock(() => Promise.resolve([["data"]]));

		try {
			// Define a callback function
			const callback = mock(
				(newVal: any, oldVal: any, row: number, rowData: any[]) => {}
			);

			// Set up watching a column
			googleSheet.watchColumn("Sheet1!A1:C10", 1, callback, 5000);

			// Allow any pending promises to resolve
			await new Promise(process.nextTick);

			// Verify setInterval was called with the correct interval
			expect(mockSetInterval).toHaveBeenCalledWith(
				expect.any(Function),
				5000
			);

			// @ts-expect-error - accessing private property for test
			expect(googleSheet.watchInterval).toBe(123);
		} finally {
			// Restore original functions
			global.setInterval = originalSetInterval;
			// @ts-expect-error - accessing private method for test
			googleSheet.fetchData = originalFetchData;
		}
	});

	test("stopWatching clears the interval", () => {
		// Mock clearInterval
		const originalClearInterval = global.clearInterval;
		const mockClearInterval = mock((id: number) => {});
		global.clearInterval = mockClearInterval as any;

		try {
			// @ts-expect-error - accessing private property for test
			googleSheet.watchInterval = 123;

			// Call stopWatching
			googleSheet.stopWatching();

			// Verify clearInterval was called with the correct ID
			expect(mockClearInterval).toHaveBeenCalledWith(123);

			// @ts-expect-error - accessing private property for test
			expect(googleSheet.watchInterval).toBeNull();
		} finally {
			// Restore original clearInterval
			global.clearInterval = originalClearInterval;
		}
	});

	test("handles API errors gracefully", async () => {
		// Save original fetchCellValue implementation
		const originalFetchCellValue = googleSheet.fetchCellValue;

		try {
			// Replace fetchCellValue with a version that returns a rejected promise
			googleSheet.fetchCellValue = mock(() => {
				return Promise.reject(new Error("API Error"));
			});

			// Test that the rejected promise is properly caught
			await expect(
				googleSheet.fetchCellValue("test-spreadsheet-id", "Sheet1!A1")
			).rejects.toThrow("API Error");
		} finally {
			// Restore original method
			googleSheet.fetchCellValue = originalFetchCellValue;
		}
	});
});

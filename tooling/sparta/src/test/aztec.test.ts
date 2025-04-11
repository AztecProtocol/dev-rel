import { expect, test, beforeAll, describe } from "bun:test";
import { Aztec } from "../clients/aztec.js";
import { config } from "dotenv";

config({ path: ".env.local" });

// Set the RPC URL for tests
const TEST_RPC_URL = process.env.AZTEC_NODE_URL || "http://localhost:8080";
let aztec: Aztec;
let isNodeAvailable = false;

// Verify node is available before tests
beforeAll(async () => {
	aztec = new Aztec(TEST_RPC_URL);

	try {
		// Try to get L2 tips to check if node is available
		await aztec.getL2Tips();
		isNodeAvailable = true;
		console.log(`Connected to Aztec node at ${TEST_RPC_URL}`);
	} catch (error: any) {
		console.warn(
			`⚠️ Aztec node at ${TEST_RPC_URL} is not available. Some tests will be skipped.`
		);
		console.warn(`Error: ${error.message}`);
		throw new Error("Aztec node is not available");
	}
});

describe("Aztec Integration Tests", () => {
	test("Aztec.new() initializes client with correct URL", async () => {
		// This test doesn't need the node to be available
		process.env.AZTEC_NODE_URL = TEST_RPC_URL;
		const instance = await Aztec.new();
		// @ts-expect-error - accessing private property for test
		expect(instance.rpcUrl).toBe(TEST_RPC_URL);
	});

	test("getL2Tips returns the proven block number", async () => {
		if (!isNodeAvailable) {
			console.log("Skipping test: getL2Tips - node not available");
			return;
		}

		const blockNumber = await aztec.getL2Tips();
		console.log(`Current proven block: ${blockNumber}`);
		expect(typeof blockNumber).toBe("number");
		expect(blockNumber).toBeGreaterThan(0);
	});

	test("getArchiveSiblingPath returns sibling path data", async () => {
		if (!isNodeAvailable) {
			console.log(
				"Skipping test: getArchiveSiblingPath - node not available"
			);
			return;
		}

		// Get the current proven block
		const provenBlock = await aztec.getL2Tips();
		console.log(`Using proven block: ${provenBlock}`);

		const siblingPath = await aztec.getArchiveSiblingPath(provenBlock);

		// Check if we got a valid response format
		expect(siblingPath).toBeDefined();

		// console.log("Sibling path:", JSON.stringify(siblingPath, null, 2));
	});

	test("handles RPC errors gracefully", async () => {
		// Create an instance with an invalid URL to force an error
		const badAztec = new Aztec("http://nonexistent-url:9999");

		// This should throw an error when trying to connect
		await expect(badAztec.getL2Tips()).rejects.toThrow();
	});
});

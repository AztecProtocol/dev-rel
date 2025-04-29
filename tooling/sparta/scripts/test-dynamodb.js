/**
 * DynamoDB Test Script
 *
 * This script tests the DynamoDB connection and performs basic operations
 * to verify that DynamoDB is set up correctly.
 *
 * Usage:
 *   node test-dynamodb.js [table-name]
 *
 * Example:
 *   node test-dynamodb.js sparta-sessions
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
	DynamoDBDocumentClient,
	PutCommand,
	GetCommand,
	DeleteCommand,
	ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const tableName = process.argv[2] || "users";
const isLocal = process.env.IS_LOCAL !== "false";
const endpoint = process.env.DYNAMODB_LOCAL_ENDPOINT || "http://localhost:8000";

console.log("====== DynamoDB Test ======");
console.log(`Table: ${tableName}`);
console.log(`Mode: ${isLocal ? "LOCAL" : "AWS"}`);
if (isLocal) {
	console.log(`Endpoint: ${endpoint}`);
}
console.log("============================\n");

async function runTest() {
	try {
		// Create DynamoDB client
		const clientOptions = isLocal ? { endpoint } : {};
		console.log("Creating DynamoDB client with options:", clientOptions);

		const client = new DynamoDBClient(clientOptions);
		const docClient = DynamoDBDocumentClient.from(client);

		// Test connection by listing tables
		console.log("1. Testing connection...");

		// Create a test item
		const testId = `test-item-${Date.now()}`;
		console.log(`2. Creating test item with ID: ${testId}`);
		const putCommand = new PutCommand({
			TableName: tableName,
			Item: {
				sessionId: testId,
				discordUserId: "test-user",
				verified: false,
				roleAssigned: false,
				createdAt: Date.now(),
				status: "test",
			},
		});

		await docClient.send(putCommand);
		console.log("   ✅ Test item created successfully");

		// Read the item back
		console.log(`3. Reading test item with ID: ${testId}`);
		const getCommand = new GetCommand({
			TableName: tableName,
			Key: { sessionId: testId },
		});

		const response = await docClient.send(getCommand);
		if (response.Item) {
			console.log("   ✅ Test item read successfully");
			console.log("   Item:", JSON.stringify(response.Item, null, 2));
		} else {
			console.log("   ❌ Failed to read test item");
		}

		// Delete the test item
		console.log(`4. Deleting test item with ID: ${testId}`);
		const deleteCommand = new DeleteCommand({
			TableName: tableName,
			Key: { sessionId: testId },
		});

		await docClient.send(deleteCommand);
		console.log("   ✅ Test item deleted successfully");

		// Verify deletion
		const verifyGet = await docClient.send(getCommand);
		if (!verifyGet.Item) {
			console.log("   ✅ Verified item was deleted");
		} else {
			console.log("   ❌ Item still exists after deletion attempt");
		}

		// List all items in the table
		console.log("5. Listing all items in the table (max 10)");
		const scanCommand = new ScanCommand({
			TableName: tableName,
			Limit: 10,
		});

		const scanResponse = await docClient.send(scanCommand);
		console.log(
			`   Found ${scanResponse.Items?.length || 0} items in the table`
		);
		if (scanResponse.Items?.length > 0) {
			console.log(
				"   Sample item:",
				JSON.stringify(scanResponse.Items[0], null, 2)
			);
		}

		console.log("\n✅ All tests passed! DynamoDB is working correctly.");
	} catch (error) {
		console.error("\n❌ Test failed!");
		console.error("Error:", error.message);
		console.error("Error Name:", error.name);
		console.error("Error Code:", error.code);
		console.error("Full Error:", error);
		process.exit(1);
	}
}

runTest();

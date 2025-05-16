/**
 * Update Node Operators Script
 *
 * This script updates the "node operators" DynamoDB table by:
 * 1. Adding a boolean field "isApproved" (default to false)
 * 2. For each operator, fetching their Discord username and adding it as a field
 *
 * Usage:
 *   node update-node-operators.js [table-name]
 *
 * Example:
 *   node update-node-operators.js sparta-node-operators-dev
 *
 * Note: This script uses ES Modules. Ensure your package.json has "type": "module"
 * or run with: node --input-type=module update-node-operators.js
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// Configuration
const tableName = process.argv[2] || "sparta-node-operators-dev";
const isLocal = process.env.IS_LOCAL !== "false";
const endpoint = process.env.DYNAMODB_LOCAL_ENDPOINT || "http://localhost:8000";
const botToken = process.env.BOT_TOKEN;
const guildId = process.env.GUILD_ID;

console.log("====== Node Operators Table Update ======");
console.log(`Table: ${tableName}`);
console.log(`Mode: ${isLocal ? "LOCAL" : "AWS"}`);
if (isLocal) {
  console.log(`Endpoint: ${endpoint}`);
}
console.log("=========================================\n");

async function updateNodeOperators() {
  try {
    // Validate Discord bot token
    if (!botToken) {
      console.error("Error: BOT_TOKEN environment variable is required");
      process.exit(1);
    }

    // Validate Guild ID
    if (!guildId) {
      console.error("Error: GUILD_ID environment variable is required");
      process.exit(1);
    }

    // Create DynamoDB client
    const clientOptions = isLocal ? { endpoint } : {};
    console.log("Creating DynamoDB client with options:", clientOptions);
    const dbClient = new DynamoDBClient(clientOptions);
    const docClient = DynamoDBDocumentClient.from(dbClient);

    // Create Discord client with necessary intents
    console.log("Initializing Discord client...");
    const discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
      ],
    });

    // Login to Discord
    console.log("Logging in to Discord...");
    await discordClient.login(botToken);
    console.log("Discord login successful!");

    // Fetch the guild
    console.log(`Fetching guild with ID: ${guildId}`);
    const guild = await discordClient.guilds.fetch(guildId);
    console.log(`Guild fetch successful: ${guild.name}`);

    // Scan all items from the table
    console.log("Scanning table for node operators...");
    const scanCommand = new ScanCommand({
      TableName: tableName,
    });

    const scanResponse = await docClient.send(scanCommand);
    const operators = scanResponse.Items || [];
    console.log(`Found ${operators.length} node operators in the table`);

    // Initialize counters
    let successCount = 0;
    let errorCount = 0;

    // Process each operator
    console.log("\nUpdating node operators...");
    for (const operator of operators) {
      const { discordId } = operator;
      console.log(`\nProcessing operator with Discord ID: ${discordId}`);

      try {
        // Fetch Discord user information
        let discordUsername = null;
        try {
          console.log(`Fetching Discord member information for ID: ${discordId}`);
          const member = await guild.members.fetch(discordId);
          discordUsername = member.user.username;
          console.log(`Found username: ${discordUsername}`);
        } catch (discordError) {
          console.warn(`Could not fetch Discord member for ID ${discordId}: ${discordError.message}`);
        }

        // Check if fields already exist before updating
        if (operator.isApproved !== undefined && (operator.discordUsername !== undefined || !discordUsername)) {
          console.log(`Skipping operator ${discordId} - fields already exist`);
          successCount++; // Count as success since no update needed
          continue;
        }

        // Update the operator record
        const updateCommand = new UpdateCommand({
          TableName: tableName,
          Key: { discordId },
          UpdateExpression: discordUsername 
            ? "SET isApproved = :isApproved, discordUsername = :discordUsername, updatedAt = :updatedAt"
            : "SET isApproved = :isApproved, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":isApproved": false,
            ...(discordUsername ? { ":discordUsername": discordUsername } : {}),
            ":updatedAt": Date.now(),
          },
          ReturnValues: "UPDATED_NEW",
        });

        const updateResult = await docClient.send(updateCommand);
        console.log(`Update result:`, updateResult.Attributes);
        successCount++;
      } catch (error) {
        console.error(`Error updating operator ${discordId}:`, error.message);
        errorCount++;
      }
    }

    // Log completion summary
    console.log("\n===== Update Summary =====");
    console.log(`Total operators: ${operators.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed to update: ${errorCount}`);
    console.log("==========================");

    // Cleanup
    console.log("Logging out from Discord...");
    discordClient.destroy();
    console.log("Script completed!");
  } catch (error) {
    console.error("\n❌ Script failed!");
    console.error("Error:", error.message);
    console.error("Error Name:", error.name);
    console.error("Error Code:", error.code);
    console.error("Full Error:", error);
    process.exit(1);
  }
}

updateNodeOperators(); 
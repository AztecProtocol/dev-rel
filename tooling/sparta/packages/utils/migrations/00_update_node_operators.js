/**
 * Update Node Operators Script
 *
 * This script updates the "node operators" DynamoDB table by:
 * Fetching Discord usernames for operators who don't have one and updating their records
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

import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// Configuration
const tableName = process.env.NODE_OPERATORS_TABLE_NAME || "sparta-node-operators-dev";
const endpoint = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
const botToken = process.env.BOT_TOKEN;
const guildId = process.env.GUILD_ID;
const isLocal = process.env.LOCAL_DYNAMO_DB === "true";

console.log("====== Node Operators Table Update ======");
console.log(`Table: ${tableName}`);
console.log(`Endpoint: ${endpoint}`);
console.log(`Guild ID: ${guildId}`);
console.log(`Using local DynamoDB: ${isLocal ? "yes" : "no"}`);
console.log(`AWS Region: ${process.env.AWS_REGION || "default"}`);
console.log("=========================================\n");

// Helper function to wait between requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    const clientOptions = isLocal 
      ? { endpoint }
      : process.env.AWS_REGION 
        ? { region: process.env.AWS_REGION } 
        : {};
        
    console.log("Creating DynamoDB client with options:", clientOptions);
    const dbClient = new DynamoDBClient(clientOptions);
    const docClient = DynamoDBDocumentClient.from(dbClient);

    // List available tables to verify connection and check if our table exists
    console.log("Listing available DynamoDB tables...");
    try {
      const listTablesCommand = new ListTablesCommand({});
      const listTablesResponse = await docClient.send(listTablesCommand);
      console.log("Available tables:", listTablesResponse.TableNames);
      
      if (!listTablesResponse.TableNames?.includes(tableName)) {
        console.error(`ERROR: Table "${tableName}" not found in available tables!`);
        console.log("Please check your AWS configuration or create the table.");
        process.exit(1);
      }
      console.log(`Confirmed table "${tableName}" exists!`);
    } catch (tableError) {
      console.error("Failed to list DynamoDB tables:", tableError);
      console.log("This may indicate incorrect AWS credentials or permissions.");
      process.exit(1);
    }

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
    console.log(`Guild fetch successful: ${guild.name} (${guild.memberCount} members)`);
    
    // Force fetch members to improve member lookup
    console.log("Pre-fetching guild members...");
    try {
      await guild.members.fetch();
      console.log("Successfully pre-fetched guild members");
    } catch (error) {
      console.warn("Warning: Failed to pre-fetch all guild members. Will attempt individual lookups.", error.message);
    }

    // Scan operators without discordUsername with pagination
    console.log("Scanning table for node operators without discordUsername (using pagination)...");
    
    // Array to collect all operators that need updating
    let operators = [];
    let lastEvaluatedKey = undefined;
    let pageNum = 0;
    
    // Scan the table with pagination
    do {
      pageNum++;
      console.log(`Scanning page ${pageNum}...`);
      
      const scanParams = {
        TableName: tableName,
        FilterExpression: "attribute_not_exists(discordUsername)",
        Limit: 1000, // Process in smaller batches
      };
      
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const scanCommand = new ScanCommand(scanParams);
      const scanResponse = await docClient.send(scanCommand);
      
      const pageOperators = scanResponse.Items || [];
      operators = [...operators, ...pageOperators];
      
      console.log(`Found ${pageOperators.length} operators without username on page ${pageNum}, total so far: ${operators.length}`);
      
      // Get the last evaluated key for the next page
      lastEvaluatedKey = scanResponse.LastEvaluatedKey;
      
    } while (lastEvaluatedKey);
    
    console.log(`Finished scanning. Found ${operators.length} total node operators without discordUsername`);

    // Initialize counters
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Process each operator
    console.log("\nUpdating node operators...");
    for (const operator of operators) {
      const { discordId } = operator;
      console.log(`\nProcessing operator with Discord ID: ${discordId}`);

      try {
        // Special debug for example discordId
        if (discordId === "904664241544495154") {
          console.log("⚠️ This is the example discordId mentioned in the issue!");
        }

        // Fetch Discord user information
        let discordUsername = null;
        try {
          console.log(`Attempting to fetch Discord member for ID: ${discordId}`);
          
          // First try regular fetch
          let member = null;
          try {
            member = guild.members.cache.get(discordId);
            if (member) {
              console.log("Member found in cache");
            } else {
              console.log("Member not in cache, fetching from API...");
              member = await guild.members.fetch({ user: discordId, force: true });
            }
          } catch (innerError) {
            console.warn(`Failed regular fetch: ${innerError.message}`);
            console.log("Trying to fetch user directly...");
            
            // If member fetch fails, try to fetch the user directly
            const user = await discordClient.users.fetch(discordId, { force: true });
            console.log(`Found user directly: ${user.username}`);
            discordUsername = user.username;
          }
          
          if (member && !discordUsername) {
            discordUsername = member.user.username;
          }
          
          if (discordUsername) {
            console.log(`✅ Found Discord username: "${discordUsername}"`);
          } else {
            throw new Error("Could not determine username despite fetching user/member");
          }
        } catch (discordError) {
          console.warn(`❌ Could not find Discord member/user for ID ${discordId}: ${discordError.message}`);
          console.log("Skipping this record as no username was found");
          skipCount++;
          continue; // Skip this record if no username found
        }

        // Only update if we found a username
        if (discordUsername) {
          console.log(`Updating DynamoDB record for ${discordId} with username "${discordUsername}"...`);
          const updateCommand = new UpdateCommand({
            TableName: tableName,
            Key: { discordId },
            UpdateExpression: "SET discordUsername = :discordUsername, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
              ":discordUsername": discordUsername,
              ":updatedAt": Date.now(),
            },
            ReturnValues: "UPDATED_NEW",
          });

          const updateResult = await docClient.send(updateCommand);
          console.log(`✅ DB update successful:`, updateResult.Attributes);
          successCount++;
        }
        
        // Add a small delay to avoid rate limiting
        await sleep(500);
      } catch (error) {
        console.error(`❌ Error updating operator ${discordId}:`, error.message);
        errorCount++;
      }
    }

    // Log completion summary
    console.log("\n===== Update Summary =====");
    console.log(`Total operators without discordUsername: ${operators.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Skipped (username not found): ${skipCount}`);
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

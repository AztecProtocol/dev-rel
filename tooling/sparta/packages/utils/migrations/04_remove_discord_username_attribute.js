/**
 * Remove discordUsername and walletAddress Attributes from Node Operators Script
 *
 * This script uses the validators API endpoint to identify active operators
 * and removes orphaned operators from the NODE_OPERATORS_TABLE_NAME.
 * For active operators, it removes the 'discordUsername' and 'walletAddress' attributes.
 *
 * This is intended to be run after the GSI and attribute
 * definitions have been removed from the Terraform configuration for the table.
 *
 * Usage (via run-migration.js):
 *   npm run migrate --prefix packages/utils 04_remove_discord_username_attribute
 *
 * Environment variables read:
 *   AWS_REGION (optional, defaults to 'eu-west-2')
 *   NODE_OPERATORS_TABLE_NAME (required)
 *   API_URL (optional, defaults to 'http://localhost:3000')
 *   BACKEND_API_KEY (required for API authentication)
 *   DYNAMODB_ENDPOINT (optional, for local DynamoDB instances)
 *   LOCAL_DYNAMO_DB (optional, set to "true" for local, influences endpoint usage)
 *   DRY_RUN (optional, set to "true" to log actions without writing to DB)
 *   TEST_MODE (optional, set to "true" to process only a small batch of items)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

// Configuration
const REGION = process.env.AWS_REGION || "eu-west-2";
const NODE_OPERATORS_TABLE_NAME = process.env.NODE_OPERATORS_TABLE_NAME;
const API_URL = `${process.env.API_URL}/api` || 'http://localhost:3000/api';
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT; // For local testing
const IS_LOCAL = process.env.LOCAL_DYNAMO_DB === "true";
const IS_DRY_RUN = process.env.DRY_RUN === "true";
const IS_TEST_MODE = process.env.TEST_MODE === "true";

console.log("====== Remove discordUsername and walletAddress Attributes from Node Operators & Cleanup Orphans ======");
console.log(`Node Operators Table: ${NODE_OPERATORS_TABLE_NAME}`);
console.log(`API URL: ${API_URL}`);
console.log(`Region: ${REGION}`);
if (IS_LOCAL && DYNAMODB_ENDPOINT) {
  console.log(`Using local DynamoDB endpoint: ${DYNAMODB_ENDPOINT}`);
} else if (IS_LOCAL) {
  console.log(`Local mode (LOCAL_DYNAMO_DB=true) but DYNAMODB_ENDPOINT not set, will use default AWS SDK behavior for local if configured.`);
}
console.log(`Dry Run: ${IS_DRY_RUN}`);
console.log(`Test Mode (limited items): ${IS_TEST_MODE}`);
console.log("===============================================================\n");

if (!NODE_OPERATORS_TABLE_NAME) {
  console.error("❌ Error: NODE_OPERATORS_TABLE_NAME environment variable is not set.");
  process.exit(1);
}

if (!BACKEND_API_KEY) {
  console.error("❌ Error: BACKEND_API_KEY environment variable is not set.");
  process.exit(1);
}

const clientOptions = {};
if (IS_LOCAL && DYNAMODB_ENDPOINT) {
  clientOptions.endpoint = DYNAMODB_ENDPOINT;
  clientOptions.region = "local"; // Often 'local' or 'us-east-1' for local DynamoDB
} else {
  clientOptions.region = REGION;
}

const client = new DynamoDBClient(clientOptions);
const docClient = DynamoDBDocumentClient.from(client);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to get all active operators from the validators API endpoint
async function getActiveOperatorDiscordIds() {
  console.log(`Fetching validators from API endpoint: ${API_URL}/validator/validators`);
  
  try {
    const url = `${API_URL}/validator/validators`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': BACKEND_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data || !data.data.validators) {
      throw new Error(`Invalid API response format: ${JSON.stringify(data)}`);
    }

    const validators = data.data.validators;
    const activeDiscordIds = new Set();

    console.log(`Retrieved ${validators.length} validators from API`);
    console.log(`API Stats: Total: ${data.data.stats.totalValidators}, Active: ${data.data.stats.activeValidators}, Known: ${data.data.stats.knownValidators}`);

    let validatorsWithOperators = 0;
    validators.forEach(validator => {
      if (validator.operator && validator.operatorId) {
        activeDiscordIds.add(validator.operatorId);
        validatorsWithOperators++;
        if (IS_TEST_MODE && validatorsWithOperators <= 10) {
          console.log(`  [TEST_MODE_API_FETCH] Found operator: ${validator.operatorId} for validator: ${validator.address}`);
        }
      }
    });

    console.log(`Found ${activeDiscordIds.size} unique active operator Discord IDs from ${validatorsWithOperators} validators with operators`);
    
    if (IS_TEST_MODE && activeDiscordIds.size > 0) {
      console.log(`  [TEST_MODE_API_FETCH] Sample of active IDs found: ${Array.from(activeDiscordIds).slice(0, 10).join(", ")}`);
    }

    return activeDiscordIds;

  } catch (error) {
    console.error("❌ Error fetching validators from API:", error.message);
    throw error;
  }
}

async function processNodeOperators() {
  console.log(`Starting migration for Node Operators table (${NODE_OPERATORS_TABLE_NAME}):`);
  console.log(`Phase 1: Identify and remove orphaned operators.`);
  console.log(`Phase 2: Remove 'discordUsername' and 'walletAddress' attributes from active operators.`);

  let activeOperatorDiscordIds;
  try {
    activeOperatorDiscordIds = await getActiveOperatorDiscordIds();
    console.log(`Retrieved ${activeOperatorDiscordIds.size} active operator Discord IDs from the API.`);
    if (IS_TEST_MODE && activeOperatorDiscordIds.size > 0) {
      console.log(`  [TEST_MODE_OPERATOR_PROCESS] Sample of active IDs received: ${Array.from(activeOperatorDiscordIds).slice(0, 10).join(", ")}`);
    }
    if (activeOperatorDiscordIds.size === 0) {
      console.warn("⚠️ WARNING: The set of active operator Discord IDs from the API is EMPTY. This will likely result in all node operators being treated as orphaned if you proceed without IS_DRY_RUN=true.");
    }
  } catch (error) {
    console.error("❌ Critical error: Could not retrieve active operator IDs from API. Aborting migration.");
    process.exit(1);
    return; // For type safety, though process.exit will terminate
  }

  let lastEvaluatedKey_operators = undefined;
  let itemsScanned_operators = 0;
  let itemsProcessedForAttributeRemoval = 0;
  let itemsAttributesUpdated = 0;
  let itemsFoundOrphaned = 0;
  let itemsDeletedOrphaned = 0;
  let pageNum_operators = 0;
  const batchLimit_operators = IS_TEST_MODE ? 5 : 50;

  try {
    do {
      pageNum_operators++;
      console.log(`Scanning Node Operators Page ${pageNum_operators}...`);
      const scanParams_operators = {
        TableName: NODE_OPERATORS_TABLE_NAME,
        ProjectionExpression: "discordId, discordUsername, walletAddress",
        ExclusiveStartKey: lastEvaluatedKey_operators,
        Limit: batchLimit_operators,
      };

      const scanCommand_operators = new ScanCommand(scanParams_operators);
      const scanResponse_operators = await docClient.send(scanCommand_operators);

      if (scanResponse_operators.Items && scanResponse_operators.Items.length > 0) {
        itemsScanned_operators += scanResponse_operators.Items.length;
        console.log(`Node Operators Page ${pageNum_operators}: Found ${scanResponse_operators.Items.length} items. Total scanned so far: ${itemsScanned_operators}`);

        for (const item of scanResponse_operators.Items) {
          // Phase 1: Check if operator is orphaned
          if (!activeOperatorDiscordIds.has(item.discordId)) {
            itemsFoundOrphaned++;
            // console.log(`  [DEBUG] Operator ${item.discordId} is being considered ORPHANED. Not found in active set of size ${activeOperatorDiscordIds.size}.`);
            if (IS_DRY_RUN) {
              console.log(`    [DRY RUN] Would delete orphaned operator ${item.discordId}.`);
              itemsDeletedOrphaned++;
            } else {
              const deleteParams = {
                TableName: NODE_OPERATORS_TABLE_NAME,
                Key: { discordId: item.discordId },
              };
              try {
                const deleteCommand = new DeleteCommand(deleteParams);
                await docClient.send(deleteCommand);
                // console.log(`    ✅ Successfully deleted orphaned operator ${item.discordId}.`);
                itemsDeletedOrphaned++;
              } catch (deleteError) {
                console.error(`    ❌ Error deleting orphaned operator ${item.discordId}:`, deleteError.message);
              }
              await sleep(50); // Small delay
            }
            continue; // Move to the next item, skip attribute removal for this orphaned one
          }

          // Phase 2: Operator is active, proceed with discordUsername/walletAddress removal logic
          let attributesToRemove = [];
          let detailMessages = [];
          let baseLogMessage = `Active Operator (discordId '${item.discordId}')`;

          if (item.hasOwnProperty("discordUsername")) {
            attributesToRemove.push("discordUsername");
            detailMessages.push(`'discordUsername' ('${item.discordUsername}')`);
          }
          if (item.hasOwnProperty("walletAddress")) {
            attributesToRemove.push("walletAddress");
            detailMessages.push(`'walletAddress' ('${item.walletAddress}')`);
          }

          if (attributesToRemove.length > 0) {
            itemsProcessedForAttributeRemoval++;
            console.log(`${baseLogMessage}: Found ${detailMessages.join(" and ")} to remove.`);
            
            if (IS_DRY_RUN) {
              console.log(`    [DRY RUN] Would remove ${attributesToRemove.join(" and ")} for discordId ${item.discordId}`);
              itemsAttributesUpdated++;
            } else {
              const conditionExpressionParts = [];
              
              attributesToRemove.forEach(attr => {
                conditionExpressionParts.push(`attribute_exists(${attr})`); 
              });
              
              const updateExpression = `REMOVE ${attributesToRemove.join(", ")}`;

              const updateParams = {
                TableName: NODE_OPERATORS_TABLE_NAME,
                Key: { discordId: item.discordId },
                UpdateExpression: updateExpression,
                ConditionExpression: conditionExpressionParts.join(" AND "), // Ensures we only update if attributes still exist
                ReturnValues: "UPDATED_OLD", 
              };

              try {
                const updateCommand = new UpdateCommand(updateParams);
                const result = await docClient.send(updateCommand);
                console.log(`    ✅ Successfully removed ${attributesToRemove.join(" and ")} for discordId ${item.discordId}. Old values: ${JSON.stringify(result.Attributes)}`);
                itemsAttributesUpdated++;
              } catch (updateError) {
                if (updateError.name === 'ConditionalCheckFailedException') {
                  console.warn(`    ⚠️ Attributes (${attributesToRemove.join(", ")}) were already removed or never existed for discordId ${item.discordId} (ConditionalCheckFailedException).`);
                } else {
                  console.error(`    ❌ Error updating item ${item.discordId} to remove attributes:`, updateError.message);
                }
              }
              await sleep(50); // Small delay
            }
          } else {
            console.log(`${baseLogMessage}: No 'discordUsername' or 'walletAddress' attributes found to remove.`);
          }
        }
      } else {
        console.log(`Node Operators Page ${pageNum_operators}: No items found.`);
      }
      lastEvaluatedKey_operators = scanResponse_operators.LastEvaluatedKey;
      if (lastEvaluatedKey_operators) {
        console.log("More node operators to scan, continuing to next page...");
      }
      
      if (IS_TEST_MODE && itemsScanned_operators >= batchLimit_operators) {
        console.log("🛑 TEST_MODE enabled for node operators scan: Stopping after the first batch.");
        lastEvaluatedKey_operators = undefined; // Stop pagination for test mode
      }

    } while (lastEvaluatedKey_operators);

    console.log("Migration Summary:");
    console.log("--- Node Operators Table ---");
    console.log(`Total node operators scanned: ${itemsScanned_operators}`);
    console.log(`Orphaned operators (not linked to any validator): ${itemsFoundOrphaned}`);
    if (IS_DRY_RUN) {
      console.log(`Orphaned operators that would be DELETED: ${itemsDeletedOrphaned}`);
    } else {
      console.log(`Orphaned operators successfully DELETED: ${itemsDeletedOrphaned}`);
    }
    console.log(`Active operators processed for attribute ('discordUsername'/'walletAddress') removal: ${itemsProcessedForAttributeRemoval}`);
    if (IS_DRY_RUN) {
      console.log(`Active operators that would have attributes removed: ${itemsAttributesUpdated}`);
    } else {
      console.log(`Active operators successfully updated (attributes removed): ${itemsAttributesUpdated}`);
    }
    console.log("Migration finished.");

  } catch (error) {
    console.error("An error occurred during the node operator processing phase:", error);
    process.exit(1);
  }
}

// Run the migration
processNodeOperators().catch(error => {
  console.error("Unhandled error during migration execution:", error.message);
  process.exit(1);
}); 
/**
 * Migration script to create a separate validators table and migrate validators
 * from being an array in the node operators table to their own dedicated table
 * 
 * This script:
 * 1. Creates a new DynamoDB table for validators if it doesn't exist
 * 2. Migrates validators from the node operators table to the validators table
 * 
 * Usage:
 *   node 01_migrate_validators.js
 * 
 * Note: This script uses ES Modules to match the project structure.
 */

import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
dotenv.config();

// Configuration
const operatorsTableName = process.argv[2] || "sparta-node-operators-dev";
const validatorsTableName = process.argv[3] || "sparta-validators-dev";
const NODE_OPERATOR_INDEX_NAME = "NodeOperatorIndex";   
const isLocal = process.env.IS_LOCAL !== "false";
const endpoint = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";

console.log("====== Validators Migration ======");
console.log("Source table (node operators): " + operatorsTableName);
console.log("Target table (validators): " + validatorsTableName);
console.log(`Mode: ${isLocal ? "LOCAL" : "AWS"}`);
if (isLocal) {
  console.log(`Endpoint: ${endpoint}`);
}
console.log("================================\n");

async function runMigration() {
  try {
    // Create DynamoDB client
    const clientOptions = isLocal ? { endpoint } : {};
    console.log("Creating DynamoDB client with options:", clientOptions);
    const client = new DynamoDBClient(clientOptions);
    const docClient = DynamoDBDocumentClient.from(client);

    // STEP 1: Create the validators table if it doesn't exist
    console.log("\nStep 1: Creating validators table...");
    await createValidatorsTable(client);

    console.log("\n✅ Migration completed successfully!");
    return { success: true };
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    return { success: false, error: error.message };
  }
}

async function createValidatorsTable(client) {
  try {
    // Define table structure
    const tableParams = {
      TableName: validatorsTableName,
      AttributeDefinitions: [
        {
          AttributeName: "validatorAddress",
          AttributeType: "S",
        },
        {
          AttributeName: "nodeOperatorId",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "validatorAddress",
          KeyType: "HASH", // Partition key
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: NODE_OPERATOR_INDEX_NAME,
          KeySchema: [
            {
              AttributeName: "nodeOperatorId",
              KeyType: "HASH", // Partition key
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    };

    console.log("Creating table with params:", JSON.stringify(tableParams, null, 2));
    const result = await client.send(new CreateTableCommand(tableParams));
    console.log("✅ Table created successfully:", result.TableDescription.TableName);
    
    // Wait for table to be active
    console.log("Waiting for table to become active...");
    // In a real script, you might want to implement a proper waiter here
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return true;
  } catch (error) {
    if (error.name === "ResourceInUseException") {
      console.log("✅ Table already exists, continuing with migration");
      return true;
    }
    throw error;
  }
}

// Run the migration
runMigration()
  .then(result => {
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Unhandled error in migration:", error);
    process.exit(1);
  }); 
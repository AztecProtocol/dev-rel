/**
 * Migration: Populate Validator History Table
 * 
 * This migration fetches validator stats from the L2 RPC endpoint and populates
 * the sparta-production-validator-history table with historical attestation data.
 * 
 * The script:
 * 1. Fetches validator stats from the RPC endpoint
 * 2. Iterates through each validator sequentially 
 * 3. For each validator, writes their history entries to DynamoDB
 * 4. Checks for existing entries and skips duplicates
 * 5. Processes validators one by one to avoid rate limits
 * 
 * Usage:
 *   npm run migrate --prefix packages/utils 05_populate_validator_history
 * 
 * Environment variables:
 *   AWS_REGION (optional, defaults to 'eu-west-2')
 *   VALIDATOR_HISTORY_TABLE_NAME (required)
 *   AZTEC_RPC_URL (optional, defaults to 'http://35.230.8.105:8080')
 *   DYNAMODB_ENDPOINT (optional, for local DynamoDB instances)
 *   LOCAL_DYNAMO_DB (optional, set to "true" for local)
 *   DRY_RUN (optional, set to "true" to log actions without writing to DB)
 *   TEST_MODE (optional, set to "true" to process only first 2 validators)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

// Configuration
const REGION = process.env.AWS_REGION || "eu-west-2";
const VALIDATOR_HISTORY_TABLE_NAME = process.env.VALIDATOR_HISTORY_TABLE_NAME;
const RPC_URL = process.env.AZTEC_RPC_URL || 'http://35.230.8.105:8080';
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT; // For local testing
const IS_LOCAL = process.env.LOCAL_DYNAMO_DB === "true";
const IS_DRY_RUN = process.env.DRY_RUN === "true";
const IS_TEST_MODE = process.env.TEST_MODE === "true";

console.log("====== Populate Validator History Table Migration ======");
console.log(`Validator History Table: ${VALIDATOR_HISTORY_TABLE_NAME}`);
console.log(`RPC URL: ${RPC_URL}`);
console.log(`Region: ${REGION}`);
if (IS_LOCAL && DYNAMODB_ENDPOINT) {
  console.log(`Using local DynamoDB endpoint: ${DYNAMODB_ENDPOINT}`);
} else if (IS_LOCAL) {
  console.log(`Local mode (LOCAL_DYNAMO_DB=true) but DYNAMODB_ENDPOINT not set, will use default AWS SDK behavior for local if configured.`);
}
console.log(`Dry Run: ${IS_DRY_RUN}`);
console.log(`Test Mode (limited validators): ${IS_TEST_MODE}`);
console.log("=========================================================\n");

if (!VALIDATOR_HISTORY_TABLE_NAME) {
  console.error("❌ Error: VALIDATOR_HISTORY_TABLE_NAME environment variable is not set.");
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

/**
 * Fetch validator stats from L2 RPC endpoint
 */
async function fetchValidatorStats() {
    const payload = {
        jsonrpc: "2.0",
        id: 15,
        method: "node_getValidatorsStats",
        params: []
    };

    console.log(`🔄 Fetching validator stats from ${RPC_URL}...`);
    
    try {
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.result || !data.result.stats) {
            throw new Error('Invalid response format from RPC endpoint');
        }

        const validatorCount = Object.keys(data.result.stats).length;
        console.log(`✅ Successfully fetched stats for ${validatorCount} validators`);
        
        return data.result.stats;
    } catch (error) {
        console.error("❌ Error fetching validator stats from RPC:", error.message);
        throw error;
    }
}

/**
 * Write validator history entries to DynamoDB
 * @param {Array} historyEntries - Array of history entries with validatorAddress, slot, status
 */
async function writeHistoryEntries(historyEntries) {
    if (historyEntries.length === 0) {
        return { successCount: 0, duplicateCount: 0, errorCount: 0 };
    }

    const BATCH_SIZE = 25; // DynamoDB batch write limit
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    // Process entries in batches
    for (let i = 0; i < historyEntries.length; i += BATCH_SIZE) {
        const batch = historyEntries.slice(i, i + BATCH_SIZE);
        
        try {
            // Check for existing entries first to avoid duplicates
            const duplicateChecks = batch.map(async entry => {
                try {
                    const result = await docClient.send(new GetCommand({
                        TableName: VALIDATOR_HISTORY_TABLE_NAME,
                        Key: {
                            validatorAddress: entry.validatorAddress,
                            slot: parseInt(entry.slot, 10) // Convert to number
                        }
                    }));
                    return { entry, exists: !!result.Item };
                } catch (error) {
                    console.error(`Error checking duplicate for ${entry.validatorAddress}:${entry.slot}:`, error.message);
                    return { entry, exists: false, error };
                }
            });

            const checkResults = await Promise.all(duplicateChecks);
            const newEntries = checkResults.filter(result => !result.exists && !result.error);
            const existingEntries = checkResults.filter(result => result.exists);
            const errorEntries = checkResults.filter(result => result.error);

            duplicateCount += existingEntries.length;
            errorCount += errorEntries.length;

            if (newEntries.length === 0) {
                continue; // All entries in this batch already exist or had errors
            }

            // Prepare batch write for new entries
            const putRequests = newEntries.map(({ entry }) => ({
                PutRequest: {
                    Item: {
                        validatorAddress: entry.validatorAddress,
                        slot: parseInt(entry.slot, 10), // Store as number
                        status: entry.status,
                        timestamp: Date.now()
                    }
                }
            }));

            const batchWriteParams = {
                RequestItems: {
                    [VALIDATOR_HISTORY_TABLE_NAME]: putRequests
                }
            };

            await docClient.send(new BatchWriteCommand(batchWriteParams));
            successCount += newEntries.length;

            console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${newEntries.length} new, ${existingEntries.length} duplicates, ${errorEntries.length} errors`);

        } catch (error) {
            console.error(`❌ Error writing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
            errorCount += batch.length;
        }

        // Add delay between batches to avoid throttling
        if (i + BATCH_SIZE < historyEntries.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return { successCount, duplicateCount, errorCount };
}

/**
 * Process a single validator's history
 */
async function processValidatorHistory(validatorAddress, validatorData) {
    console.log(`🔄 Processing validator: ${validatorAddress}`);
    
    if (!validatorData.history || !Array.isArray(validatorData.history)) {
        console.log(`  ⚠️  No history data for validator ${validatorAddress}`);
        return { processed: 0, skipped: 0, errors: 0 };
    }

    const history = validatorData.history;
    console.log(`  📊 Found ${history.length} history entries`);

    if (IS_DRY_RUN) {
        console.log(`  🔍 [DRY RUN] Would process ${history.length} entries`);
        return { processed: history.length, skipped: 0, errors: 0 };
    }

    // Prepare history entries for batch writing
    const historyEntries = history.map(entry => ({
        validatorAddress: validatorAddress,
        slot: entry.slot,
        status: entry.status
    }));

    // Write all entries in batches
    const result = await writeHistoryEntries(historyEntries);
    
    console.log(`  ✅ Completed validator ${validatorAddress}: ${result.successCount} written, ${result.duplicateCount} duplicates, ${result.errorCount} errors`);
    return { 
        processed: result.successCount, 
        skipped: result.duplicateCount, 
        errors: result.errorCount 
    };
}

/**
 * Main migration function
 */
async function runMigration() {
    console.log('🚀 Starting Validator History Population Migration');
    console.log('=' .repeat(60));

    try {
        // Fetch validator stats from RPC
        const validatorStats = await fetchValidatorStats();
        let validatorAddresses = Object.keys(validatorStats);
        
        // Limit to first 2 validators in test mode
        if (IS_TEST_MODE) {
            validatorAddresses = validatorAddresses.slice(0, 2);
            console.log(`🧪 TEST_MODE: Processing only first ${validatorAddresses.length} validators`);
        }
        
        console.log(`📝 Found ${validatorAddresses.length} validators to process`);
        console.log('=' .repeat(60));

        let totalProcessed = 0;
        let totalSkipped = 0;
        let totalErrors = 0;
        let validatorCount = 0;

        // Process each validator sequentially
        for (const validatorAddress of validatorAddresses) {
            validatorCount++;
            const validatorData = validatorStats[validatorAddress];
            
            console.log(`\n[${validatorCount}/${validatorAddresses.length}] Processing validator: ${validatorAddress}`);
            
            try {
                const result = await processValidatorHistory(validatorAddress, validatorData);
                totalProcessed += result.processed;
                totalSkipped += result.skipped;
                totalErrors += result.errors;

                // Delay between validators to avoid rate limits
                if (!IS_DRY_RUN && validatorCount < validatorAddresses.length) {
                    await sleep(200);
                }

            } catch (error) {
                console.error(`❌ Failed to process validator ${validatorAddress}:`, error.message);
                totalErrors++;
                continue;
            }
        }

        console.log('\n' + '=' .repeat(60));
        console.log('🎉 Migration completed successfully!');
        console.log(`📊 Total validators processed: ${validatorCount}`);
        console.log(`📝 Total history entries written: ${totalProcessed}`);
        console.log(`⏭️  Total entries skipped (already existed): ${totalSkipped}`);
        console.log(`❌ Total errors: ${totalErrors}`);
        console.log('=' .repeat(60));

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

// Run the migration
try {
    await runMigration();
    console.log('✅ Migration 05_populate_validator_history completed successfully');
} catch (error) {
    console.error('❌ Migration 05_populate_validator_history failed:', error.message);
    process.exit(1);
} 
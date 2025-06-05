/**
 * Migration: Populate New Node Operators Table with Address Primary Key
 * 
 * This migration creates new operator records in the new node-op table structure
 * that uses wallet addresses as the primary key instead of Discord IDs. It:
 * 
 * 1. Fetches all validators from the API
 * 2. Groups validators by their operator ID
 * 3. For each operator, finds the validator with the highest lastAttestationSlot
 * 4. Fetches existing operator data from the old table (discordId primary key)
 * 5. Creates new operator records in the new table (address primary key)
 * 6. Operators without validators/addresses will be logged and skipped
 * 
 * This is a SAFE migration that creates new records without touching existing ones.
 * The old table remains untouched for rollback purposes.
 * 
 * Usage:
 *   OLD_NODE_OPERATORS_TABLE_NAME=sparta-production-node-operators NEW_NODE_OPERATORS_TABLE_NAME=sparta-production-node-op npm run migrate --prefix packages/utils 06_add_wallet_to_operators
 * 
 * Environment variables:
 *   AWS_REGION (optional, defaults to 'eu-west-2')
 *   OLD_NODE_OPERATORS_TABLE_NAME (required, the old table to read from)
 *   NEW_NODE_OPERATORS_TABLE_NAME (required, the new table to write to)
 *   API_URL (optional, defaults to 'http://localhost:3000')
 *   BACKEND_API_KEY (required for API authentication)
 *   DYNAMODB_ENDPOINT (optional, for local DynamoDB instances)
 *   LOCAL_DYNAMO_DB (optional, set to "true" for local)
 *   DRY_RUN (optional, set to "true" to log actions without writing to DB)
 *   TEST_MODE (optional, set to "true" to process only first 5 operators)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

// Configuration
const REGION = process.env.AWS_REGION || "eu-west-2";
const OLD_NODE_OPERATORS_TABLE_NAME = process.env.OLD_NODE_OPERATORS_TABLE_NAME; // Old table (discordId primary key)
const NEW_NODE_OPERATORS_TABLE_NAME = process.env.NEW_NODE_OPERATORS_TABLE_NAME; // New table (address primary key)
const API_URL = process.env.API_URL || 'http://localhost:3000';
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT; // For local testing
const IS_LOCAL = process.env.LOCAL_DYNAMO_DB === "true";
const IS_DRY_RUN = process.env.DRY_RUN === "true";
const IS_TEST_MODE = process.env.TEST_MODE === "true";

console.log("====== Populate New Node Operators Table (Address Primary Key) ======");
console.log(`Old Node Operators Table (read from): ${OLD_NODE_OPERATORS_TABLE_NAME}`);
console.log(`New Node Operators Table (write to): ${NEW_NODE_OPERATORS_TABLE_NAME}`);
console.log(`API URL: ${API_URL}`);
console.log(`Region: ${REGION}`);
if (IS_LOCAL && DYNAMODB_ENDPOINT) {
  console.log(`Using local DynamoDB endpoint: ${DYNAMODB_ENDPOINT}`);
} else if (IS_LOCAL) {
  console.log(`Local mode (LOCAL_DYNAMO_DB=true) but DYNAMODB_ENDPOINT not set, will use default AWS SDK behavior for local if configured.`);
}
console.log(`Dry Run: ${IS_DRY_RUN}`);
console.log(`Test Mode (limited operators): ${IS_TEST_MODE}`);
console.log("=========================================================\n");

if (!OLD_NODE_OPERATORS_TABLE_NAME) {
  console.error("❌ Error: OLD_NODE_OPERATORS_TABLE_NAME environment variable is not set.");
  process.exit(1);
}

if (!NEW_NODE_OPERATORS_TABLE_NAME) {
  console.error("❌ Error: NEW_NODE_OPERATORS_TABLE_NAME environment variable is not set.");
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

/**
 * Fetch all validators from the API
 */
async function fetchAllValidators() {
    const url = `${API_URL}/api/validator/validators`;
    
    console.log(`🔄 Fetching validators from ${url}...`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'x-api-key': BACKEND_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.data || !data.data.validators) {
            throw new Error('Invalid response format from API');
        }

        const validators = data.data.validators;
        const stats = data.data.stats;
        
        console.log(`✅ Successfully fetched ${validators.length} validators`);
        console.log(`📊 Stats: Total: ${stats.totalValidators}, Active: ${stats.activeValidators}, Known: ${stats.knownValidators}`);
        
        return validators;
    } catch (error) {
        console.error("❌ Error fetching validators from API:", error.message);
        throw error;
    }
}

/**
 * Get all operators from the table
 */
async function getAllOperators() {
    const operators = [];
    let lastEvaluatedKey = undefined;

    do {
        const scanParams = {
            TableName: OLD_NODE_OPERATORS_TABLE_NAME,
        };

        if (lastEvaluatedKey) {
            scanParams.ExclusiveStartKey = lastEvaluatedKey;
        }

        try {
            const result = await docClient.send(new ScanCommand(scanParams));
            if (result.Items) {
                operators.push(...result.Items);
            }
            lastEvaluatedKey = result.LastEvaluatedKey;
        } catch (error) {
            console.error("❌ Error scanning operators table:", error.message);
            throw error;
        }
    } while (lastEvaluatedKey);

    return operators;
}

/**
 * Group validators by operator and find the best wallet address for each operator
 * @param {Array} validators - Array of validator objects
 * @returns {Map} Map of operatorId to { address: validatorAddress, validatorInfo: { ... } }
 */
function processValidatorsByOperator(validators) {
    const operatorMap = new Map();
    
    for (const validator of validators) {
        // Skip validators without an operator
        if (!validator.operatorId) {
            continue;
        }
        
        const operatorId = validator.operatorId;
        const currentEntry = operatorMap.get(operatorId);
        
        // Parse lastAttestationSlot as number, default to 0 if not present
        const attestationSlot = parseInt(validator.lastAttestationSlot) || 0;
        
        // If this is the first validator for this operator, or if this validator has a higher attestation slot
        if (!currentEntry || attestationSlot > (currentEntry.validatorInfo.lastAttestationSlot || 0)) {
            operatorMap.set(operatorId, {
                address: validator.address,
                validatorInfo: {
                    address: validator.address,
                    lastAttestationSlot: attestationSlot,
                    lastAttestationDate: validator.lastAttestationDate,
                    hasAttested24h: validator.hasAttested24h
                }
            });
        }
    }
    
    return operatorMap;
}

/**
 * Create a new operator record with address as primary key in the NEW table
 */
async function createOperatorWithAddress(operatorData) {
    const putParams = {
        TableName: NEW_NODE_OPERATORS_TABLE_NAME,
        Item: operatorData,
        ConditionExpression: "attribute_not_exists(address)"
    };

    try {
        const result = await docClient.send(new PutCommand(putParams));
        return { success: true };
    } catch (error) {
        if (error.name === "ConditionalCheckFailedException") {
            // Operator with this address already exists
            return { success: false, error: "Operator with this address already exists" };
        }
        console.error(`❌ Error creating operator with address ${operatorData.address}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Main migration function
 */
async function runMigration() {
    console.log('🚀 Starting Migration: Populate New Node Operators Table (Address Primary Key)');
    console.log('=' .repeat(70));

    const report = {
        totalValidators: 0,
        validatorsWithOperators: 0,
        uniqueOperators: 0,
        existingOperators: 0,
        operatorsProcessed: 0,
        operatorsMigrated: 0,
        operatorsSkippedNoAddress: 0,
        operatorsAlreadyMigrated: 0,
        errors: 0,
        migrated: [],
        skippedNoAddress: [],
        alreadyMigrated: [],
        errors: []
    };

    try {
        // Step 1: Fetch all validators and existing operators
        const [validators, existingOperators] = await Promise.all([
            fetchAllValidators(),
            getAllOperators()
        ]);
        
        report.totalValidators = validators.length;
        report.existingOperators = existingOperators.length;
        
        // Step 2: Process validators by operator
        console.log('\n📝 Processing validators by operator...');
        const operatorAddressMap = processValidatorsByOperator(validators);
        report.uniqueOperators = operatorAddressMap.size;
        report.validatorsWithOperators = validators.filter(v => v.operatorId).length;
        
        console.log(`Found ${report.uniqueOperators} unique operators from ${report.validatorsWithOperators} validators with operators`);
        console.log(`Existing operators in table: ${report.existingOperators}`);
        
        // Step 3: Process each existing operator
        console.log('\n🔄 Creating new operator records in the new table...');
        console.log('=' .repeat(60));
        
        let processedCount = 0;
        const operatorsToProcess = IS_TEST_MODE ? existingOperators.slice(0, 5) : existingOperators;
        
        for (const operator of operatorsToProcess) {
            processedCount++;
            console.log(`\n[${processedCount}/${operatorsToProcess.length}] Processing operator: ${operator.discordId}`);
            report.operatorsProcessed++;
            
            // Check if operator already has address as primary key (already migrated)
            if (operator.address && !operator.discordId) {
                console.log(`  ✅ Operator already migrated (using address as primary key)`);
                report.operatorsAlreadyMigrated++;
                report.alreadyMigrated.push({
                    address: operator.address,
                    discordId: operator.discordId
                });
                continue;
            }
            
            // Get the address from validators map
            const validatorData = operatorAddressMap.get(operator.discordId);
            
            if (!validatorData) {
                console.log(`  ⚠️  No validators found for operator, cannot determine address`);
                report.operatorsSkippedNoAddress++;
                report.skippedNoAddress.push({
                    discordId: operator.discordId,
                    reason: 'No validators found'
                });
                continue;
            }
            
            const newAddress = validatorData.address;
            console.log(`  Selected address: ${newAddress}`);
            console.log(`  From validator with lastAttestationSlot: ${validatorData.validatorInfo.lastAttestationSlot}`);
            
            if (IS_DRY_RUN) {
                console.log(`  🔍 [DRY RUN] Would create operator record in new table with address ${newAddress} as primary key`);
                report.operatorsMigrated++;
                report.migrated.push({
                    discordId: operator.discordId,
                    address: newAddress,
                    validatorInfo: validatorData.validatorInfo,
                    dryRun: true
                });
            } else {
                // Create new operator record with address as primary key
                const newOperatorData = {
                    ...operator,
                    address: newAddress,
                    // Keep discordId as a regular attribute for the GSI
                };
                
                const createResult = await createOperatorWithAddress(newOperatorData);
                
                if (createResult.success) {
                    console.log(`  ✅ Created new operator record in new table with address ${newAddress} as primary key`);
                    
                    report.operatorsMigrated++;
                    report.migrated.push({
                        discordId: operator.discordId,
                        address: newAddress,
                        validatorInfo: validatorData.validatorInfo
                    });
                } else {
                    console.log(`  ❌ Failed to create new operator record: ${createResult.error}`);
                    report.errors++;
                    report.errors.push({
                        discordId: operator.discordId,
                        address: newAddress,
                        error: createResult.error
                    });
                }
                
                // Small delay to avoid throttling
                await sleep(50);
            }
        }
        
        // Step 4: Generate final report
        console.log('\n' + '=' .repeat(70));
        console.log('📊 Migration Report');
        console.log('=' .repeat(70));
        console.log(`Total validators fetched: ${report.totalValidators}`);
        console.log(`Validators with operators: ${report.validatorsWithOperators}`);
        console.log(`Unique operators in validators: ${report.uniqueOperators}`);
        console.log(`Existing operators in old table: ${report.existingOperators}`);
        console.log(`Operators processed: ${report.operatorsProcessed}`);
        console.log(`New operator records created: ${report.operatorsMigrated}`);
        console.log(`Operators skipped (no address): ${report.operatorsSkippedNoAddress}`);
        console.log(`Operators already in new table: ${report.operatorsAlreadyMigrated}`);
        console.log(`Errors encountered: ${report.errors}`);
        console.log(`\n✅ Old table remains untouched for rollback purposes.`);
        
        if (report.skippedNoAddress.length > 0) {
            console.log('\n⚠️  Operators skipped (no validators/address):');
            report.skippedNoAddress.forEach(({ discordId, reason }) => {
                console.log(`  - ${discordId}: ${reason}`);
            });
        }
        
        if (report.errors.length > 0) {
            console.log('\n❌ Errors:');
            report.errors.forEach(({ discordId, address, error }) => {
                console.log(`  - ${discordId} -> ${address}: ${error}`);
            });
        }
        
        console.log('\n' + '=' .repeat(70));
        console.log('🎉 Migration completed! New table populated successfully.');
        console.log('=' .repeat(70));

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

// Run the migration
try {
    await runMigration();
    console.log('✅ Migration 06_add_wallet_to_operators completed successfully');
} catch (error) {
    console.error('❌ Migration 06_add_wallet_to_operators failed:', error.message);
    process.exit(1);
} 
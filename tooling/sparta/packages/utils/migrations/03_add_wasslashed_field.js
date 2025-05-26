/**
 * Migration script to add wasSlashed field and check for slashed validators
 * 
 * This script:
 * 1. Adds a wasSlashed boolean field to the operators table
 * 2. Fetches all validators from the database
 * 3. Gets the current validator set from the blockchain
 * 4. Identifies validators that are in the DB but not in the current set (slashed)
 * 5. Updates slashed validators' operators: sets wasSlashed=true, isApproved=false
 * 6. Removes slashed validators from validators table
 * 7. Generates a report of affected users
 * 
 * Usage:
 *   DRY_RUN=true npm run migrate 03_add_wasslashed_field  # Dry run mode
 *   TEST_MODE=true npm run migrate 03_add_wasslashed_field # Test with one validator only
 *   npm run migrate 03_add_wasslashed_field               # Execute changes
 * 
 * Environment variables:
 *   DRY_RUN=true - Run in dry mode (no database writes)
 *   TEST_MODE=true - Process only the first slashed validator found (for testing)
 *   NODE_OPERATORS_TABLE_NAME - Override default table name
 *   VALIDATORS_TABLE_NAME - Override default table name
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";
import fetch from 'node-fetch';

// Configuration
const operatorsTableName = process.env.NODE_OPERATORS_TABLE_NAME || "sparta-node-operators-dev";
const validatorsTableName = process.env.VALIDATORS_TABLE_NAME || "sparta-validators-dev";
const endpoint = process.env.DYNAMODB_LOCAL_ENDPOINT || "http://localhost:8000";
const API_URL = `${process.env.API_URL}/api` || 'http://localhost:3000/api';
const BACKEND_API_KEY = process.env.BACKEND_API_KEY || 'your-api-key';
const DRY_RUN = process.env.DRY_RUN === 'true';
const TEST_MODE = process.env.TEST_MODE === 'true';
const isLocal = process.env.IS_LOCAL !== "false";

console.log("====== Add wasSlashed Field Migration ======");
console.log("Operators table: " + operatorsTableName);
console.log("Validators table: " + validatorsTableName);
console.log("Dry run mode: " + (DRY_RUN ? "enabled (no database writes)" : "disabled"));
console.log("Test mode: " + (TEST_MODE ? "enabled (process only one validator)" : "disabled"));
console.log("Mode: " + (isLocal ? "LOCAL" : "AWS"));
console.log("============================================\n");

// Report data
const report = {
  totalValidatorsInDB: 0,
  totalValidatorsOnChain: 0,
  slashedValidators: [],
  affectedOperators: [],
  errors: []
};

/**
 * Fetches all validators from the database with pagination
 */
async function getAllValidatorsFromDB(docClient) {
  console.log('📊 Fetching all validators from database...');
  
  let allValidators = [];
  let lastEvaluatedKey = undefined;
  let pageCount = 0;
  
  do {
    const scanParams = {
      TableName: validatorsTableName,
      Limit: 1000
    };
    
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const command = new ScanCommand(scanParams);
    const response = await docClient.send(command);
    const validators = response.Items || [];
    
    console.log(`   Retrieved ${validators.length} validators from page ${++pageCount}`);
    allValidators = [...allValidators, ...validators];
    
    lastEvaluatedKey = response.LastEvaluatedKey;
    
  } while (lastEvaluatedKey);
  
  console.log(`✅ Total validators in database: ${allValidators.length}`);
  report.totalValidatorsInDB = allValidators.length;
  return allValidators;
}

/**
 * Fetches current validator set from the blockchain via API
 */
async function getCurrentValidatorSet() {
  console.log('🔗 Fetching current validator set from blockchain...');
  
  if (!BACKEND_API_KEY) {
    throw new Error('BACKEND_API_KEY environment variable is required');
  }
  
  const url = `${API_URL}/operator/validators`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': BACKEND_API_KEY
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.success && data.data && data.data.blockchainValidators && data.data.blockchainValidators.validators) {
    const blockchainValidators = data.data.blockchainValidators.validators;
    console.log(`✅ Current validator set size: ${blockchainValidators.length}`);
    report.totalValidatorsOnChain = blockchainValidators.length;
    
    // Convert to lowercase for case-insensitive comparison
    return blockchainValidators.map(addr => addr.toLowerCase());
  } else {
    throw new Error('Unexpected API response format for validator set');
  }
}

/**
 * Identifies slashed validators (in DB but not in current validator set)
 */
function identifySlashedValidators(dbValidators, currentValidatorSet) {
  console.log('🔍 Identifying slashed validators...');
  
  const currentValidatorSetLower = new Set(currentValidatorSet);
  const slashedValidators = [];
  
  for (const validator of dbValidators) {
    const validatorAddressLower = validator.validatorAddress.toLowerCase();
    
    if (!currentValidatorSetLower.has(validatorAddressLower)) {
      slashedValidators.push(validator);
      console.log(`   🚨 Slashed validator found: ${validator.validatorAddress} (operator: ${validator.nodeOperatorId})`);
      
      // In test mode, only process the first slashed validator found
      if (TEST_MODE) {
        console.log(`   🧪 TEST MODE: Stopping after finding first slashed validator`);
        break;
      }
    }
  }
  
  const totalSlashed = slashedValidators.length;
  const processingMsg = TEST_MODE && totalSlashed > 0 
    ? `📊 Found ${totalSlashed} slashed validator (TEST MODE - processing only this one)`
    : `📊 Found ${totalSlashed} slashed validators out of ${dbValidators.length} total`;
  
  console.log(processingMsg);
  
  report.slashedValidators = slashedValidators.map(v => ({
    validatorAddress: v.validatorAddress,
    nodeOperatorId: v.nodeOperatorId
  }));
  
  return slashedValidators;
}

/**
 * Gets node operator details by Discord ID
 */
async function getNodeOperator(docClient, discordId) {
  try {
    const command = new GetCommand({
      TableName: operatorsTableName,
      Key: { discordId }
    });
    
    const response = await docClient.send(command);
    return response.Item || null;
  } catch (error) {
    console.error(`❌ Error fetching operator ${discordId}:`, error.message);
    report.errors.push(`Failed to fetch operator ${discordId}: ${error.message}`);
    return null;
  }
}

/**
 * Updates a node operator to set wasSlashed=true and isApproved=false
 */
async function updateSlashedOperator(docClient, discordId, operatorInfo) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would update operator ${discordId} (${operatorInfo.discordUsername || 'No username'}) - set wasSlashed=true, isApproved=false`);
    return true;
  }
  
  try {
    const command = new UpdateCommand({
      TableName: operatorsTableName,
      Key: { discordId },
      UpdateExpression: "SET wasSlashed = :wasSlashed, isApproved = :isApproved, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":wasSlashed": true,
        ":isApproved": false,
        ":updatedAt": Date.now()
      }
    });
    
    await docClient.send(command);
    console.log(`   ✅ Updated operator ${discordId} - set wasSlashed=true, isApproved=false`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to update operator ${discordId}:`, error.message);
    report.errors.push(`Failed to update operator ${discordId}: ${error.message}`);
    return false;
  }
}

/**
 * Removes a slashed validator from the database
 */
async function removeSlashedValidator(docClient, validatorAddress) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would remove validator ${validatorAddress} from database`);
    return true;
  }
  
  try {
    const command = new DeleteCommand({
      TableName: validatorsTableName,
      Key: { validatorAddress }
    });
    
    await docClient.send(command);
    console.log(`   ✅ Removed validator ${validatorAddress} from database`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to remove validator ${validatorAddress}:`, error.message);
    report.errors.push(`Failed to remove validator ${validatorAddress}: ${error.message}`);
    return false;
  }
}

/**
 * Processes slashed validators
 */
async function processSlashedValidators(docClient, slashedValidators) {
  console.log('\n🔄 Processing slashed validators...');
  
  if (slashedValidators.length === 0) {
    console.log('✅ No slashed validators found - nothing to process');
    return;
  }
  
  for (const validator of slashedValidators) {
    console.log(`\n📝 Processing validator: ${validator.validatorAddress}`);
    
    // Get operator information
    const operator = await getNodeOperator(docClient, validator.nodeOperatorId);
    if (!operator) {
      console.log(`   ⚠️  Operator ${validator.nodeOperatorId} not found - skipping`);
      continue;
    }
    
    // Add to affected operators report
    report.affectedOperators.push({
      discordId: operator.discordId,
      discordUsername: operator.discordUsername || 'No username',
      walletAddress: operator.walletAddress,
      validatorAddress: validator.validatorAddress,
      wasApproved: operator.isApproved
    });
    
    // Update operator approval status
    await updateSlashedOperator(docClient, validator.nodeOperatorId, operator);
    
    // Remove validator from database
    await removeSlashedValidator(docClient, validator.validatorAddress);
  }
}

/**
 * Generates and displays the final report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION REPORT');
  if (TEST_MODE) {
    console.log('🧪 TEST MODE - LIMITED TO ONE VALIDATOR');
  }
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - NO CHANGES MADE');
  }
  console.log('='.repeat(60));
  
  console.log(`\n📈 STATISTICS:`);
  console.log(`   Total validators in database: ${report.totalValidatorsInDB}`);
  console.log(`   Total validators on chain: ${report.totalValidatorsOnChain}`);
  console.log(`   Slashed validators found: ${report.slashedValidators.length}${TEST_MODE ? ' (limited to 1 in test mode)' : ''}`);
  console.log(`   Affected operators: ${report.affectedOperators.length}`);
  console.log(`   Errors encountered: ${report.errors.length}`);
  
  if (report.slashedValidators.length > 0) {
    console.log(`\n🚨 SLASHED VALIDATORS:`);
    report.slashedValidators.forEach((validator, index) => {
      console.log(`   ${index + 1}. ${validator.validatorAddress} (operator: ${validator.nodeOperatorId})`);
    });
  }
  
  if (report.affectedOperators.length > 0) {
    console.log(`\n👥 AFFECTED OPERATORS:`);
    report.affectedOperators.forEach((operator, index) => {
      console.log(`   ${index + 1}. ${operator.discordUsername} (${operator.discordId})`);
      console.log(`      Wallet: ${operator.walletAddress}`);
      console.log(`      Validator: ${operator.validatorAddress}`);
      console.log(`      Was approved: ${operator.wasApproved}`);
      console.log('');
    });
  }
  
  if (report.errors.length > 0) {
    console.log(`\n❌ ERRORS:`);
    report.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  if (TEST_MODE) {
    console.log(`\n🧪 TEST MODE ENABLED`);
    console.log(`   - Only the first slashed validator was processed`);
    console.log(`   - Run without TEST_MODE=true to process all slashed validators`);
  }
  
  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN MODE - No changes were made to the database`);
    console.log(`   Run without DRY_RUN=true to execute the changes`);
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    // Create DynamoDB client
    const clientOptions = isLocal ? { endpoint } : {};
    const client = new DynamoDBClient(clientOptions);
    const docClient = DynamoDBDocumentClient.from(client);
    
    console.log('🚀 Starting wasSlashed field migration...\n');
    
    // Step 1: Get all validators from database
    const dbValidators = await getAllValidatorsFromDB(docClient);
    
    // Step 2: Get current validator set from blockchain
    const currentValidatorSet = await getCurrentValidatorSet();
    
    // Step 3: Identify slashed validators
    const slashedValidators = identifySlashedValidators(dbValidators, currentValidatorSet);
    
    // Step 4: Process slashed validators
    await processSlashedValidators(docClient, slashedValidators);
    
    // Step 5: Generate report
    generateReport();
    
    console.log('\n✅ Migration completed successfully!');
    return { success: true };
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    report.errors.push(`Migration failed: ${error.message}`);
    generateReport();
    
    return { success: false, error: error.message };
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
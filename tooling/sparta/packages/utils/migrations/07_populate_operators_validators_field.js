/**
 * Migration: Populate Validators Field on Node Operators
 * 
 * This migration restores the `validators` array field on node operators by:
 * 1. Reading all validators from the validators table
 * 2. Grouping them by nodeOperatorId
 * 3. Updating each operator with their validators array
 * 
 * The validators array contains objects with the structure:
 * {
 *   validatorAddress: string
 * }
 * 
 * Usage:
 *   NODE_OPERATORS_TABLE_NAME=sparta-production-node-op VALIDATORS_TABLE_NAME=sparta-production-validators npm run migrate --prefix packages/utils 07_populate_operators_validators_field
 * 
 * Environment variables:
 *   AWS_REGION (optional, defaults to 'eu-west-2')
 *   NODE_OPERATORS_TABLE_NAME (required, the operators table to update)
 *   VALIDATORS_TABLE_NAME (required, the validators table to read from)
 *   DYNAMODB_ENDPOINT (optional, for local DynamoDB instances)
 *   LOCAL_DYNAMO_DB (optional, set to "true" for local)
 *   DRY_RUN (optional, set to "true" to log actions without writing to DB)
 *   TEST_MODE (optional, set to "true" to process only first 5 operators)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const REGION = process.env.AWS_REGION || "eu-west-2";
const NODE_OPERATORS_TABLE_NAME = process.env.NODE_OPERATORS_TABLE_NAME;
const VALIDATORS_TABLE_NAME = process.env.VALIDATORS_TABLE_NAME;
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;
const IS_LOCAL = process.env.LOCAL_DYNAMO_DB === "true";
const IS_DRY_RUN = process.env.DRY_RUN === "true";
const IS_TEST_MODE = process.env.TEST_MODE === "true";

console.log("====== Populate Validators Field on Node Operators ======");
console.log(`Node Operators Table: ${NODE_OPERATORS_TABLE_NAME}`);
console.log(`Validators Table: ${VALIDATORS_TABLE_NAME}`);
console.log(`Region: ${REGION}`);
if (IS_LOCAL && DYNAMODB_ENDPOINT) {
  console.log(`Using local DynamoDB endpoint: ${DYNAMODB_ENDPOINT}`);
}
console.log(`Dry Run: ${IS_DRY_RUN}`);
console.log(`Test Mode: ${IS_TEST_MODE}`);
console.log("=========================================================\n");

if (!NODE_OPERATORS_TABLE_NAME) {
  console.error("❌ Error: NODE_OPERATORS_TABLE_NAME environment variable is not set.");
  process.exit(1);
}

if (!VALIDATORS_TABLE_NAME) {
  console.error("❌ Error: VALIDATORS_TABLE_NAME environment variable is not set.");
  process.exit(1);
}

// DynamoDB client setup
const clientOptions = {};
if (IS_LOCAL && DYNAMODB_ENDPOINT) {
  clientOptions.endpoint = DYNAMODB_ENDPOINT;
  clientOptions.region = "local";
} else {
  clientOptions.region = REGION;
}

const client = new DynamoDBClient(clientOptions);
const docClient = DynamoDBDocumentClient.from(client);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get all validators from the validators table
 */
async function getAllValidators() {
  console.log("📖 Reading all validators from DynamoDB...");
  const validators = [];
  let lastEvaluatedKey = undefined;

  do {
    const scanParams = {
      TableName: VALIDATORS_TABLE_NAME,
    };

    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    try {
      const result = await docClient.send(new ScanCommand(scanParams));
      if (result.Items) {
        validators.push(...result.Items);
      }
      lastEvaluatedKey = result.LastEvaluatedKey;
      console.log(`  Retrieved ${validators.length} validators so far...`);
    } catch (error) {
      console.error("❌ Error scanning validators table:", error.message);
      throw error;
    }
  } while (lastEvaluatedKey);

  console.log(`✅ Successfully retrieved ${validators.length} validators`);
  return validators;
}

/**
 * Get all operators from the operators table
 */
async function getAllOperators() {
  console.log("📖 Reading all operators from DynamoDB...");
  const operators = [];
  let lastEvaluatedKey = undefined;

  do {
    const scanParams = {
      TableName: NODE_OPERATORS_TABLE_NAME,
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
      console.log(`  Retrieved ${operators.length} operators so far...`);
    } catch (error) {
      console.error("❌ Error scanning operators table:", error.message);
      throw error;
    }
  } while (lastEvaluatedKey);

  console.log(`✅ Successfully retrieved ${operators.length} operators`);
  return operators;
}

/**
 * Group validators by nodeOperatorId
 */
function groupValidatorsByOperator(validators) {
  console.log("🔄 Grouping validators by operator...");
  const operatorValidatorsMap = new Map();
  
  for (const validator of validators) {
    if (!validator.nodeOperatorId) {
      continue; // Skip validators without an operator
    }
    
    if (!operatorValidatorsMap.has(validator.nodeOperatorId)) {
      operatorValidatorsMap.set(validator.nodeOperatorId, []);
    }
    
    operatorValidatorsMap.get(validator.nodeOperatorId).push({
      validatorAddress: validator.validatorAddress
    });
  }
  
  console.log(`✅ Grouped validators for ${operatorValidatorsMap.size} operators`);
  return operatorValidatorsMap;
}

/**
 * Update operator with validators array
 */
async function updateOperatorValidators(address, validators) {
  const updateParams = {
    TableName: NODE_OPERATORS_TABLE_NAME,
    Key: { address },
    UpdateExpression: "SET validators = :validators, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":validators": validators,
      ":updatedAt": Date.now()
    },
    ConditionExpression: "attribute_exists(address)"
  };

  try {
    await docClient.send(new UpdateCommand(updateParams));
    return { success: true };
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return { success: false, error: "Operator not found" };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Migration: Populate Validators Field on Node Operators');
  console.log('=' .repeat(70));

  const report = {
    totalValidators: 0,
    totalOperators: 0,
    operatorsWithValidators: 0,
    operatorsUpdated: 0,
    operatorsSkipped: 0,
    errors: 0,
    updated: [],
    skipped: [],
    errors: []
  };

  try {
    // Step 1: Get all validators and operators
    const [validators, operators] = await Promise.all([
      getAllValidators(),
      getAllOperators()
    ]);
    
    report.totalValidators = validators.length;
    report.totalOperators = operators.length;
    
    // Step 2: Group validators by operator
    const operatorValidatorsMap = groupValidatorsByOperator(validators);
    report.operatorsWithValidators = operatorValidatorsMap.size;
    
    // Step 3: Update each operator
    console.log('\n🔄 Updating operators with validators field...');
    console.log('=' .repeat(60));
    
    let processedCount = 0;
    const operatorsToProcess = IS_TEST_MODE ? operators.slice(0, 5) : operators;
    
    for (const operator of operatorsToProcess) {
      processedCount++;
      const operatorId = operator.discordId || operator.address;
      console.log(`\n[${processedCount}/${operatorsToProcess.length}] Processing operator: ${operatorId}`);
      
      // Get validators for this operator
      const operatorValidators = operatorValidatorsMap.get(operator.discordId) || [];
      
      if (operatorValidators.length === 0) {
        console.log(`  ℹ️  No validators found for operator`);
        report.operatorsSkipped++;
        report.skipped.push({
          operator: operatorId,
          reason: 'No validators'
        });
        continue;
      }
      
      console.log(`  Found ${operatorValidators.length} validators`);
      
      if (IS_DRY_RUN) {
        console.log(`  🔍 [DRY RUN] Would update operator with ${operatorValidators.length} validators`);
        report.operatorsUpdated++;
        report.updated.push({
          operator: operatorId,
          validatorCount: operatorValidators.length,
          dryRun: true
        });
      } else {
        const updateResult = await updateOperatorValidators(operator.address, operatorValidators);
        
        if (updateResult.success) {
          console.log(`  ✅ Updated operator with ${operatorValidators.length} validators`);
          report.operatorsUpdated++;
          report.updated.push({
            operator: operatorId,
            validatorCount: operatorValidators.length
          });
        } else {
          console.log(`  ❌ Failed to update operator: ${updateResult.error}`);
          report.errors++;
          report.errors.push({
            operator: operatorId,
            error: updateResult.error
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
    console.log(`Total validators: ${report.totalValidators}`);
    console.log(`Total operators: ${report.totalOperators}`);
    console.log(`Operators with validators: ${report.operatorsWithValidators}`);
    console.log(`Operators updated: ${report.operatorsUpdated}`);
    console.log(`Operators skipped: ${report.operatorsSkipped}`);
    console.log(`Errors encountered: ${report.errors}`);
    
    if (report.skipped.length > 0 && report.skipped.length <= 10) {
      console.log('\n⚠️  Operators skipped:');
      report.skipped.forEach(({ operator, reason }) => {
        console.log(`  - ${operator}: ${reason}`);
      });
    }
    
    if (report.errors.length > 0) {
      console.log('\n❌ Errors:');
      report.errors.forEach(({ operator, error }) => {
        console.log(`  - ${operator}: ${error}`);
      });
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('🎉 Migration completed successfully!');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run the migration
try {
  await runMigration();
  console.log('✅ Migration 07_populate_operators_validators_field completed successfully');
} catch (error) {
  console.error('❌ Migration 07_populate_operators_validators_field failed:', error.message);
  process.exit(1);
} 
/**
 * Migration: Simplify Validators Field and Update NodeOperatorId References
 * 
 * This migration:
 * 1. Converts the `validators` field from an array of objects to an array of strings
 * 2. Removes the `isApproved` field from operators
 * 3. Removes the `wasSlashed` field from operators
 * 4. Updates validators' `nodeOperatorId` from Discord ID to operator address
 * 
 * Before: validators: [{ validatorAddress: "0x..." }, { validatorAddress: "0x..." }]
 * After:  validators: ["0x...", "0x..."]
 * 
 * Before: validator.nodeOperatorId = "123456789" (Discord ID)
 * After:  validator.nodeOperatorId = "0x..." (Operator address)
 * 
 * Usage:
 *   NODE_OPERATORS_TABLE_NAME=sparta-production-node-op VALIDATORS_TABLE_NAME=sparta-production-validators npm run migration --prefix packages/utils 08_simplify_validators_field
 * 
 * Environment variables:
 *   AWS_REGION (optional, defaults to 'eu-west-2')
 *   NODE_OPERATORS_TABLE_NAME (required, the operators table to update)
 *   VALIDATORS_TABLE_NAME (required, the validators table to update)
 *   DYNAMODB_ENDPOINT (optional, for local DynamoDB instances)
 *   LOCAL_DYNAMO_DB (optional, set to "true" for local)
 *   DRY_RUN (optional, set to "true" to log actions without writing to DB)
 *   TEST_MODE (optional, set to "true" to process only first 5 operators)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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

console.log("====== Simplify Validators Field and Update NodeOperatorId References ======");
console.log(`Node Operators Table: ${NODE_OPERATORS_TABLE_NAME}`);
console.log(`Validators Table: ${VALIDATORS_TABLE_NAME}`);
console.log(`Region: ${REGION}`);
if (IS_LOCAL && DYNAMODB_ENDPOINT) {
  console.log(`Using local DynamoDB endpoint: ${DYNAMODB_ENDPOINT}`);
}
console.log(`Dry Run: ${IS_DRY_RUN}`);
console.log(`Test Mode: ${IS_TEST_MODE}`);
console.log("===========================================================================\n");

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
 * Get validators by nodeOperatorId (Discord ID)
 */
async function getValidatorsByOperatorId(nodeOperatorId) {
  const validators = [];
  let lastEvaluatedKey = undefined;

  do {
    const queryParams = {
      TableName: VALIDATORS_TABLE_NAME,
      IndexName: "NodeOperatorIndex",
      KeyConditionExpression: "nodeOperatorId = :nodeOperatorId",
      ExpressionAttributeValues: {
        ":nodeOperatorId": nodeOperatorId
      }
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    try {
      const result = await docClient.send(new QueryCommand(queryParams));
      if (result.Items) {
        validators.push(...result.Items);
      }
      lastEvaluatedKey = result.LastEvaluatedKey;
    } catch (error) {
      console.error(`❌ Error querying validators for operator ${nodeOperatorId}:`, error.message);
      throw error;
    }
  } while (lastEvaluatedKey);

  return validators;
}

/**
 * Update validator's nodeOperatorId
 */
async function updateValidatorOperatorId(validatorAddress, newOperatorId) {
  const updateParams = {
    TableName: VALIDATORS_TABLE_NAME,
    Key: { validatorAddress },
    UpdateExpression: "SET nodeOperatorId = :nodeOperatorId, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":nodeOperatorId": newOperatorId,
      ":updatedAt": Date.now()
    },
    ConditionExpression: "attribute_exists(validatorAddress)"
  };

  try {
    await docClient.send(new UpdateCommand(updateParams));
    return { success: true };
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return { success: false, error: "Validator not found" };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Convert validators array from objects to strings
 */
function convertValidatorsToAddresses(validators) {
  if (!validators || !Array.isArray(validators)) {
    return [];
  }
  
  return validators
    .filter(v => v && typeof v === 'object' && v.validatorAddress)
    .map(v => v.validatorAddress);
}

/**
 * Update operator: simplify validators and remove unused fields
 */
async function updateOperator(address, updates) {
  const updateExpressions = [];
  const removeExpressions = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};
  
  // Always update the updatedAt timestamp
  updateExpressions.push("#updatedAt = :updatedAt");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeValues[":updatedAt"] = Date.now();
  
  // Update validators if provided
  if (updates.validators !== undefined) {
    updateExpressions.push("validators = :validators");
    expressionAttributeValues[":validators"] = updates.validators;
  }
  
  // Collect REMOVE expressions separately
  if (updates.removeFields && updates.removeFields.length > 0) {
    updates.removeFields.forEach(field => {
      removeExpressions.push(field);
    });
  }
  
  // Build the complete UpdateExpression
  let updateExpression = "";
  if (updateExpressions.length > 0) {
    updateExpression = "SET " + updateExpressions.join(", ");
  }
  if (removeExpressions.length > 0) {
    if (updateExpression) updateExpression += " ";
    updateExpression += "REMOVE " + removeExpressions.join(", ");
  }
  
  const updateParams = {
    TableName: NODE_OPERATORS_TABLE_NAME,
    Key: { address },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
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
  console.log('🚀 Starting Migration: Simplify Validators Field and Update NodeOperatorId References');
  console.log('=' .repeat(80));

  const report = {
    totalOperators: 0,
    operatorsWithValidators: 0,
    operatorsUpdated: 0,
    operatorsSkipped: 0,
    validatorsSimplified: 0,
    isApprovedRemoved: 0,
    wasSlashedRemoved: 0,
    validatorsUpdated: 0,
    validatorUpdateErrors: 0,
    errorCount: 0,
    updated: [],
    skipped: [],
    errors: [],
    validatorUpdates: []
  };

  try {
    // Step 1: Get all operators
    const operators = await getAllOperators();
    report.totalOperators = operators.length;
    
    // Build a map of discordId to address for quick lookups
    const discordIdToAddress = new Map();
    operators.forEach(op => {
      if (op.discordId && op.address) {
        discordIdToAddress.set(op.discordId, op.address);
      }
    });
    
    // Step 2: Process each operator
    console.log('\n🔄 Processing operators...');
    console.log('=' .repeat(60));
    
    let processedCount = 0;
    const operatorsToProcess = IS_TEST_MODE ? operators.slice(0, 5) : operators;
    
    for (const operator of operatorsToProcess) {
      processedCount++;
      const operatorId = operator.discordId || operator.address;
      console.log(`\n[${processedCount}/${operatorsToProcess.length}] Processing operator: ${operatorId}`);
      
      const updates = {
        removeFields: []
      };
      
      let needsUpdate = false;
      const updateReasons = [];
      
      // Check if validators need simplification
      if (operator.validators && Array.isArray(operator.validators) && operator.validators.length > 0) {
        const firstValidator = operator.validators[0];
        if (typeof firstValidator === 'object' && firstValidator.validatorAddress) {
          // Need to simplify validators
          const simplifiedValidators = convertValidatorsToAddresses(operator.validators);
          console.log(`  Converting ${operator.validators.length} validators from objects to addresses`);
          
          if (simplifiedValidators.length > 0) {
            updates.validators = simplifiedValidators;
            needsUpdate = true;
            updateReasons.push(`simplified ${simplifiedValidators.length} validators`);
            report.validatorsSimplified++;
            report.operatorsWithValidators++;
          }
        } else if (typeof firstValidator === 'string') {
          report.operatorsWithValidators++;
        }
      }
      
      // Check for fields to remove
      if (operator.isApproved !== undefined) {
        updates.removeFields.push('isApproved');
        needsUpdate = true;
        updateReasons.push('removed isApproved');
        report.isApprovedRemoved++;
        console.log(`  Found isApproved field (value: ${operator.isApproved})`);
      }
      
      if (operator.wasSlashed !== undefined) {
        updates.removeFields.push('wasSlashed');
        needsUpdate = true;
        updateReasons.push('removed wasSlashed');
        report.wasSlashedRemoved++;
        console.log(`  Found wasSlashed field (value: ${operator.wasSlashed})`);
      }
      
      // Perform update if needed
      if (needsUpdate) {
        if (IS_DRY_RUN) {
          console.log(`  🔍 [DRY RUN] Would update operator: ${updateReasons.join(', ')}`);
          report.operatorsUpdated++;
          report.updated.push({
            operator: operatorId,
            actions: updateReasons,
            dryRun: true
          });
        } else {
          const updateResult = await updateOperator(operator.address, updates);
          
          if (updateResult.success) {
            console.log(`  ✅ Updated operator: ${updateReasons.join(', ')}`);
            report.operatorsUpdated++;
            report.updated.push({
              operator: operatorId,
              actions: updateReasons
            });
          } else {
            console.log(`  ❌ Failed to update operator: ${updateResult.error}`);
            report.errorCount++;
            report.errors.push({
              operator: operatorId,
              error: updateResult.error
            });
          }
          
          // Small delay to avoid throttling
          await sleep(50);
        }
      } else {
        console.log(`  ℹ️  No updates needed for operator`);
        report.operatorsSkipped++;
        report.skipped.push({
          operator: operatorId,
          reason: 'No updates needed'
        });
      }
      
      // Step 3: Update validators' nodeOperatorId for this operator
      if (operator.discordId && operator.address) {
        console.log(`  🔍 Checking validators for Discord ID ${operator.discordId}...`);
        
        try {
          const validators = await getValidatorsByOperatorId(operator.discordId);
          
          if (validators.length > 0) {
            console.log(`  Found ${validators.length} validators to update`);
            
            for (const validator of validators) {
              if (IS_DRY_RUN) {
                console.log(`    🔍 [DRY RUN] Would update validator ${validator.validatorAddress}: nodeOperatorId ${operator.discordId} → ${operator.address}`);
                report.validatorsUpdated++;
              } else {
                const updateResult = await updateValidatorOperatorId(validator.validatorAddress, operator.address);
                
                if (updateResult.success) {
                  console.log(`    ✅ Updated validator ${validator.validatorAddress}: nodeOperatorId → ${operator.address}`);
                  report.validatorsUpdated++;
                } else {
                  console.log(`    ❌ Failed to update validator ${validator.validatorAddress}: ${updateResult.error}`);
                  report.validatorUpdateErrors++;
                }
                
                // Small delay to avoid throttling
                await sleep(20);
              }
            }
            
            report.validatorUpdates.push({
              operator: operatorId,
              address: operator.address,
              validatorCount: validators.length
            });
          }
        } catch (error) {
          console.log(`  ⚠️  Error querying validators: ${error.message}`);
          report.validatorUpdateErrors++;
        }
      }
    }
    
    // Step 4: Generate final report
    console.log('\n' + '=' .repeat(80));
    console.log('📊 Migration Report');
    console.log('=' .repeat(80));
    console.log(`Total operators: ${report.totalOperators}`);
    console.log(`Operators with validators: ${report.operatorsWithValidators}`);
    console.log(`Operators updated: ${report.operatorsUpdated}`);
    console.log(`Operators skipped: ${report.operatorsSkipped}`);
    console.log(`\nOperator field updates:`);
    console.log(`  - Validators simplified: ${report.validatorsSimplified}`);
    console.log(`  - isApproved removed: ${report.isApprovedRemoved}`);
    console.log(`  - wasSlashed removed: ${report.wasSlashedRemoved}`);
    console.log(`\nValidator updates:`);
    console.log(`  - Validators updated: ${report.validatorsUpdated}`);
    console.log(`  - Update errors: ${report.validatorUpdateErrors}`);
    console.log(`\nTotal errors: ${report.errorCount}`);
    
    if (report.updated.length > 0 && report.updated.length <= 10) {
      console.log('\n✅ Operators updated:');
      report.updated.forEach(({ operator, actions }) => {
        console.log(`  - ${operator}: ${actions.join(', ')}`);
      });
    } else if (report.updated.length > 10) {
      console.log(`\n✅ Updated ${report.updated.length} operators (showing first 10):`);
      report.updated.slice(0, 10).forEach(({ operator, actions }) => {
        console.log(`  - ${operator}: ${actions.join(', ')}`);
      });
    }
    
    if (report.validatorUpdates.length > 0 && report.validatorUpdates.length <= 10) {
      console.log('\n✅ Validator nodeOperatorId updates:');
      report.validatorUpdates.forEach(({ operator, address, validatorCount }) => {
        console.log(`  - Operator ${operator}: updated ${validatorCount} validators to use address ${address}`);
      });
    } else if (report.validatorUpdates.length > 10) {
      console.log(`\n✅ Updated validators for ${report.validatorUpdates.length} operators (showing first 10):`);
      report.validatorUpdates.slice(0, 10).forEach(({ operator, address, validatorCount }) => {
        console.log(`  - Operator ${operator}: updated ${validatorCount} validators to use address ${address}`);
      });
    }
    
    if (report.errors.length > 0) {
      console.log('\n❌ Errors:');
      report.errors.forEach(({ operator, error }) => {
        console.log(`  - ${operator}: ${error}`);
      });
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('🎉 Migration completed successfully!');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run the migration
try {
  await runMigration();
  console.log('✅ Migration 08_simplify_validators_field completed successfully');
} catch (error) {
  console.error('❌ Migration 08_simplify_validators_field failed:', error.message);
  process.exit(1);
} 
/**
 * Migration script to populate Validators table with validators and associate them with node operators
 * 
 * This script:
 * 1. Fetches all node operators from the API
 * 2. Fetches all validators from the API
 * 3. Matches validators with operators by wallet address
 * 4. Populates the validators table with the matched validators
 * 
 * Usage:
 *   node 02_populate_validators.js [operators-table] [validators-table]
 * 
 * Example:
 *   node 02_populate_validators.js sparta-node-operators-dev sparta-validators-dev
 * 
 * Note: This script uses ES Modules to match the project structure.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import fetch from 'node-fetch';
import dotenv from "dotenv";
dotenv.config();

// Configuration
const operatorsTableName = process.env.NODE_OPERATORS_TABLE_NAME || "sparta-node-operators-dev";
const validatorsTableName = process.env.VALIDATORS_TABLE_NAME || "sparta-validators-dev";
const endpoint = process.env.DYNAMODB_LOCAL_ENDPOINT || "http://localhost:8000";
const API_URL = `${process.env.API_URL}/api` || 'http://localhost:3000/api';
const BACKEND_API_KEY = process.env.BACKEND_API_KEY || 'your-api-key'; // Replace with your API key or use environment variable
const DRY_RUN = process.env.DRY_RUN === 'true'; // Set to true to skip saving to the database

console.log("====== Validators Population Migration ======");
console.log("Operators table: " + operatorsTableName);
console.log("Validators table: " + validatorsTableName);
console.log("Dry run mode: " + (DRY_RUN ? "enabled (no database writes)" : "disabled"));
console.log("==========================================\n");

/**
 * Fetches all node operators from the API
 * @param {DynamoDBDocumentClient} docClient The DynamoDB document client (not used, kept for compatibility)
 * @returns {Promise<Array>} List of all operators
 */
async function getOperatorsFromDB(docClient) {
  console.log('Fetching all operators from API...');
  
  if (!BACKEND_API_KEY) {
    throw new Error('BACKEND_API_KEY environment variable is required');
  }
  
  let allOperators = [];
  let nextPageToken = null;
  let pageCount = 0;
  
  do {
    // Build URL with pagination token if available
    let url = `${API_URL}/operator/operators`;
    if (nextPageToken) {
      url += `?pageToken=${encodeURIComponent(nextPageToken)}`;
    }
    
    console.log(`Fetching operators page ${pageCount + 1}...`);
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
    // The response structure includes operators and nextPageToken fields
    const operators = data.operators || [];
    nextPageToken = data.nextPageToken;
    
    console.log(`Retrieved ${operators.length} operators from page ${++pageCount}`);
    allOperators = [...allOperators, ...operators];
    
  } while (nextPageToken);
  
  console.log(`Successfully fetched a total of ${allOperators.length} operators.`);
  return allOperators;
}

/**
 * Fetches all validators from the API
 * @returns {Promise<Array>} All validators
 */
async function getAllValidators() {
  console.log('Fetching all validators from API...');
  
  if (!BACKEND_API_KEY) {
    throw new Error('BACKEND_API_KEY environment variable is required');
  }
  
  const url = `${API_URL}/operator/validators`;
  console.log("url", url);
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
  
  // Based on the updated API response structure
  if (data.success && data.data && data.data.blockchainValidators && data.data.blockchainValidators.validators) {
    const blockchainValidators = data.data.blockchainValidators.validators;
    console.log(`Successfully fetched ${blockchainValidators.length} blockchain validators.`);
    
    // Also check how many are already known
    if (data.data.knownValidators && data.data.knownValidators.validators) {
      console.log(`${data.data.knownValidators.validators.length} validators are already known in the database.`);
    }
    
    return blockchainValidators;
  } else {
    console.error('Unexpected API response format:', data);
    throw new Error('API response format was not as expected');
  }
}

/**
 * Matches validators with operators by comparing addresses
 * @param {Array} validators List of validators from blockchain
 * @param {Array} operators List of operators from DB
 * @returns {Promise<Array>} Matched validators with operator IDs
 */
async function matchValidatorsWithOperators(validators, operators) {
  console.log('Matching blockchain validators with operators by comparing addresses...');
  console.log(`Input: ${validators.length} blockchain validators and ${operators.length} operators`);
  
  const matches = [];
  
  // Create a map of operator wallet addresses to operator details for faster lookup
  // Note: addresses are stored in lowercase for case-insensitive comparison
  const operatorsByWallet = {};
  operators.forEach(operator => {
    if (operator.walletAddress) {
      operatorsByWallet[operator.walletAddress.toLowerCase()] = operator;
    }
  });
  
  console.log(`Found ${Object.keys(operatorsByWallet).length} unique operator wallet addresses`);
  
  // Debug: Print first 5 operator wallet addresses
  const walletSample = Object.keys(operatorsByWallet).slice(0, 5);
  console.log('Sample operator wallet addresses:', walletSample);
  
  // For each validator address from blockchain, check if it matches any operator's wallet address
  let matchCount = 0;
  validators.forEach(validatorAddress => {
    if (!validatorAddress) return;
    
    // For comparison, use lowercase
    const validatorAddressLower = validatorAddress.toLowerCase();
    
    // Check if this validator address matches an operator's wallet address
    const operatorWallet = operatorsByWallet[validatorAddressLower];
    if (operatorWallet) {
      matchCount++;
      // Log the match for debugging
      if (matchCount <= 5) {
        console.log(`Match found: Validator ${validatorAddress} -> Operator ${operatorWallet.discordId} (${operatorWallet.discordUsername || 'No username'})`);
      }
      
      // Store with the EXACT same case as received from the blockchain API
      matches.push({
        validatorAddress: validatorAddress, // Keep original case
        nodeOperatorId: operatorWallet.discordId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  });
  
  console.log(`Found ${matchCount} validators matching operator wallet addresses.`);
  console.log(`Total matches: ${matches.length} validators will be saved to the database.`);
  
  return matches;
}

/**
 * Saves validators to the DynamoDB table
 * @param {DynamoDBDocumentClient} docClient The DynamoDB document client
 * @param {Array} validators The validators to save
 */
async function saveValidatorsToDB(docClient, validators) {
  console.log(`Saving ${validators.length} validators to ${validatorsTableName}...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const validator of validators) {
    try {
      const putCommand = new PutCommand({
        TableName: validatorsTableName,
        Item: validator,
        ConditionExpression: "attribute_not_exists(validatorAddress)"
      });
      
      await docClient.send(putCommand);
      successCount++;
      
      // Log progress every 10 validators
      if (successCount % 10 === 0) {
        console.log(`Progress: ${successCount}/${validators.length} validators saved`);
      }
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.log(`Validator ${validator.validatorAddress} already exists, updating instead...`);
        
        try {
          const updateCommand = new UpdateCommand({
            TableName: validatorsTableName,
            Key: { validatorAddress: validator.validatorAddress },
            UpdateExpression: "set nodeOperatorId = :operatorId, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
              ":operatorId": validator.nodeOperatorId,
              ":updatedAt": Date.now()
            }
          });
          
          await docClient.send(updateCommand);
          successCount++;
        } catch (updateError) {
          console.error(`Error updating validator ${validator.validatorAddress}:`, updateError);
          errorCount++;
        }
      } else {
        console.error(`Error saving validator ${validator.validatorAddress}:`, error);
        errorCount++;
      }
    }
  }
  
  console.log(`\nValidators save complete:`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  
  return { successCount, errorCount };
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    // Create DynamoDB client
    const clientOptions = { endpoint };
    console.log("Creating DynamoDB client with options:", clientOptions);
    const client = new DynamoDBClient(clientOptions);
    const docClient = DynamoDBDocumentClient.from(client);
    
    // 1. Fetch all node operators from API
    const operators = await getOperatorsFromDB(docClient);
    
    // 2. Fetch all validators from API (these are blockchain validators)
    const blockchainValidators = await getAllValidators();
    
    // Print some samples to debug case sensitivity
    if (blockchainValidators.length > 0) {
      console.log("\nSample blockchain validator addresses (first 5):");
      blockchainValidators.slice(0, 5).forEach(addr => {
        console.log(`  ${addr} (lowercase: ${addr.toLowerCase()})`);
      });
    }
    
    // 3. Match blockchain validators with operators by wallet address
    const matchedValidators = await matchValidatorsWithOperators(blockchainValidators, operators);
    
    // 4. Save matched validators to DynamoDB
    if (matchedValidators.length > 0) {
      if (!DRY_RUN) {
        await saveValidatorsToDB(docClient, matchedValidators);
        
        // 5. Verify data was saved correctly by checking a few examples
        console.log("\nVerifying saved validators by direct DB query...");
        
        if (matchedValidators.length > 0) {
          // Try to verify a few samples
          for (let i = 0; i < Math.min(3, matchedValidators.length); i++) {
            const sampleValidator = matchedValidators[i];
            const getCommand = new ScanCommand({
              TableName: validatorsTableName,
              FilterExpression: "validatorAddress = :address",
              ExpressionAttributeValues: {
                ":address": sampleValidator.validatorAddress
              },
              Limit: 1
            });
            
            try {
              const response = await docClient.send(getCommand);
              if (response.Items && response.Items.length > 0) {
                console.log(`Sample ${i+1}: Found validator in database:`, response.Items[0]);
              } else {
                console.log(`Sample ${i+1}: Could not find validator with exact match: ${sampleValidator.validatorAddress}`);
                
                // Try case-insensitive match
                const scanCommand = new ScanCommand({
                  TableName: validatorsTableName,
                  Limit: 100
                });
                
                const scanResponse = await docClient.send(scanCommand);
                const allValidators = scanResponse.Items || [];
                
                const caseInsensitiveMatch = allValidators.find(v => 
                  v.validatorAddress.toLowerCase() === sampleValidator.validatorAddress.toLowerCase()
                );
                
                if (caseInsensitiveMatch) {
                  console.log(`  But found case-insensitive match:`, caseInsensitiveMatch);
                  console.log(`  Case difference: "${caseInsensitiveMatch.validatorAddress}" vs "${sampleValidator.validatorAddress}"`);
                } else {
                  console.log(`  No case-insensitive match found either!`);
                }
              }
            } catch (error) {
              console.error(`Error verifying validator ${i+1} in database:`, error);
            }
          }
          
          // 6. Call the validators API to check response after update...
          console.log("\nCalling validators API to check response after update...");
          try {
            const url = `${API_URL}/operator/validators`;
            const apiResponse = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': BACKEND_API_KEY
              }
            });
            
            if (!apiResponse.ok) {
              throw new Error(`HTTP error! status: ${apiResponse.status} ${apiResponse.statusText}`);
            }
            
            const apiData = await apiResponse.json();
            
            // Check how many known validators we have now
            if (apiData.success && apiData.data && apiData.data.knownValidators) {
              const knownCount = apiData.data.knownValidators.validators.length;
              console.log(`API now reports ${knownCount} known validators.`);
              
              // Check if our sample validators are included
              const samplesFound = matchedValidators.slice(0, 3).filter(sample => 
                apiData.data.knownValidators.validators.some(v => 
                  v.toLowerCase() === sample.validatorAddress.toLowerCase()
                )
              );
              
              console.log(`${samplesFound.length} out of ${Math.min(3, matchedValidators.length)} sample validators found in API response.`);
              
              if (samplesFound.length !== Math.min(3, matchedValidators.length)) {
                console.log("⚠️ Some sample validators are not included in known validators from API.");
                console.log("This may indicate a case sensitivity issue in the API.");
              } else {
                console.log("✅ All sample validators are included in known validators from API.");
              }
            } else {
              console.log("⚠️ Could not determine number of known validators from API response.");
            }
          } catch (error) {
            console.error("Error calling validators API:", error);
          }
          
          // 7. Do a complete database scan to check how many validators are actually in the database
          console.log("\nChecking total validators in database...");
          try {
            const scanCommand = new ScanCommand({
              TableName: validatorsTableName,
              Select: "COUNT",
            });
            
            const scanResponse = await docClient.send(scanCommand);
            console.log(`Found ${scanResponse.Count || 0} total validators in the database.`);
            
            // If there are validators, scan a few of them to check
            if (scanResponse.Count && scanResponse.Count > 0) {
              const detailCommand = new ScanCommand({
                TableName: validatorsTableName,
                Limit: 5,
              });
              
              const detailResponse = await docClient.send(detailCommand);
              console.log("Sample validators in database:");
              (detailResponse.Items || []).forEach((item, index) => {
                console.log(`Sample ${index + 1}:`, item);
              });
            }
          } catch (error) {
            console.error("Error scanning validators database:", error);
          }
        }
      } else {
        console.log("Dry run mode enabled, skipping database writes.");
        console.log(`Would have saved ${matchedValidators.length} validators.`);
      }
    } else {
      console.log("No validators matched with operators, nothing to save.");
    }
    
    console.log("\n✅ Migration completed successfully!");
    return { success: true };
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
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
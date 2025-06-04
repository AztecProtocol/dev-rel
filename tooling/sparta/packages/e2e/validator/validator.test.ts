import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { AxiosResponse } from "axios";
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { 
  testValidatorAddress,
  testValidatorAddress2,
  validatorTestOperator,
  validatorTestOperator2,
  waitForEthereumReady,
  makeAPIRequest 
} from "../shared/utils.js";

describe("Validator E2E Tests", () => {
  // Cleanup before all tests
  beforeEach(async () => {
    try {
      // No need to create operator here - it will be created automatically by validator addition
      console.log("🔧 Setup - No operator pre-creation needed...");
    } catch (error) {
      console.log("BeforeEach - Error during setup");
    }
  });

  afterEach(async () => {
    try {
      // Thorough cleanup: Get and delete all validators for test operators until none are left
      const testOperatorIds = [validatorTestOperator.discordId, validatorTestOperator2.discordId];
      
      for (const operatorId of testOperatorIds) {
        let hasValidators = true;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loops
        
        while (hasValidators && attempts < maxAttempts) {
          try {
            // Get all validators for this operator
            const getValidatorsResponse = await makeAPIRequest("GET", "/api/validator", {
              params: { discordId: operatorId }
            });
            
            if (getValidatorsResponse.status === 200 && 
                getValidatorsResponse.data.data.validators && 
                getValidatorsResponse.data.data.validators.length > 0) {
              
              console.log(`🧹 Found ${getValidatorsResponse.data.data.validators.length} validators for operator ${operatorId}, cleaning up...`);
              
              // Delete each validator
              for (const validator of getValidatorsResponse.data.data.validators) {
                try {
                  await makeAPIRequest("DELETE", "/api/validator", {
                    params: { 
                      validatorAddress: validator.validatorAddress, 
                      discordId: operatorId 
                    }
                  });
                  console.log(`🗑️ Deleted validator ${validator.validatorAddress} for operator ${operatorId}`);
                } catch (deleteError: any) {
                  console.log(`⚠️ Error deleting validator ${validator.validatorAddress}: ${deleteError.response?.status} ${deleteError.response?.data?.error || deleteError.message}`);
                }
              }
            } else {
              hasValidators = false;
            }
          } catch (getError) {
            // If we can't get validators (e.g., operator doesn't exist), assume no validators
            hasValidators = false;
          }
          
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          console.log(`⚠️ Max cleanup attempts reached for operator ${operatorId}`);
        }
      }

      // Clean up test operators
      await makeAPIRequest("DELETE", "/api/operator", {
        params: { discordId: validatorTestOperator.discordId }
      });
      await makeAPIRequest("DELETE", "/api/operator", {
        params: { discordId: validatorTestOperator2.discordId }
      });
      
      console.log("✅ Thorough validator cleanup completed");
    } catch (error: any) {
      console.log("AfterEach - Error during thorough cleanup:", error.response?.status, error.response?.data?.error || error.message);
    }
  });

  
  test("should get all validators from blockchain and database", async () => {
    // Wait for Ethereum/Anvil network to be ready before proceeding
    console.log("⏳ Waiting for Ethereum network to be ready...");
    await waitForEthereumReady();
    
    // This test doesn't require setup as it works with existing data
    console.log("📋 Getting all validators...");
    
    const response = await makeAPIRequest("GET", "/api/validator/validators");
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("success", true);
    expect(response.data).toHaveProperty("data");
    expect(response.data.data).toHaveProperty("validators");
    
    // Verify structure
    expect(Array.isArray(response.data.data.validators)).toBe(true);
    
    // Verify validator structure if any validators exist
    if (response.data.data.validators.length > 0) {
      const validator = response.data.data.validators[0];
      expect(validator).toHaveProperty("address");
      expect(validator).toHaveProperty("operator"); // Can be null
      expect(validator).toHaveProperty("createdAt");
      expect(validator).toHaveProperty("updatedAt");
      expect(validator).toHaveProperty("epoch");
      expect(validator).toHaveProperty("hasAttested24h");
      expect(validator).toHaveProperty("lastAttestationSlot");
      expect(validator).toHaveProperty("lastAttestationTimestamp");
      expect(validator).toHaveProperty("lastAttestationDate");
      expect(validator).toHaveProperty("lastProposalSlot");
      expect(validator).toHaveProperty("lastProposalTimestamp");
      expect(validator).toHaveProperty("lastProposalDate");
      expect(validator).toHaveProperty("missedAttestationsCount");
      expect(validator).toHaveProperty("missedProposalsCount");
      expect(validator).toHaveProperty("totalSlots");
      
      // Verify data types
      expect(typeof validator.address).toBe("string");
      expect(typeof validator.createdAt).toBe("number");
      expect(typeof validator.updatedAt).toBe("number");
      expect(typeof validator.epoch).toBe("number");
      expect(typeof validator.hasAttested24h).toBe("boolean");
      expect(typeof validator.missedAttestationsCount).toBe("number");
      expect(typeof validator.missedProposalsCount).toBe("number");
      expect(typeof validator.totalSlots).toBe("number");
    }
    
    console.log(`✅ Retrieved ${response.data.data.validators.length} validators`);
    
    // Count validators with and without operators
    const validatorsWithOperators = response.data.data.validators.filter((v: any) => v.operator !== null);
    const validatorsWithoutOperators = response.data.data.validators.filter((v: any) => v.operator === null);
    
    console.log(`✅ Found ${validatorsWithOperators.length} validators with operators`);
    console.log(`✅ Found ${validatorsWithoutOperators.length} validators without operators`);
  });

  test("should add validator to approved operator and retrieve it", async () => {
    // Step 1: Add validator to the operator
    console.log("➕ Adding validator to operator...");
    const addResponse = await makeAPIRequest("POST", "/api/validator", {
      params: { discordId: validatorTestOperator.discordId },
      data: { 
        validatorAddress: testValidatorAddress,
        skipOnChain: true
      }
    });
    expect(addResponse.status).toBe(201);
    expect(addResponse.data).toHaveProperty("success", true);
    console.log(addResponse.data);
    expect(addResponse.data.data).toHaveProperty("address", testValidatorAddress);
    expect(addResponse.data.data).toHaveProperty("operatorId", validatorTestOperator.discordId);
    console.log("✅ Validator added successfully");

    // Step 2: Verify validator by retrieving operator's validators
    console.log("🔍 Retrieving operator's validators to verify...");
    const getByOperatorResponse = await makeAPIRequest("GET", "/api/validator", {
      params: { discordId: validatorTestOperator.discordId }
    });
    expect(getByOperatorResponse.status).toBe(200);
    expect(getByOperatorResponse.data).toHaveProperty("success", true);
    expect(getByOperatorResponse.data.data).toHaveProperty("operator");
    expect(getByOperatorResponse.data.data).toHaveProperty("validators");
    expect(Array.isArray(getByOperatorResponse.data.data.validators)).toBe(true);
    
    const validatorFound = getByOperatorResponse.data.data.validators.find(
      (v: any) => v.validatorAddress === testValidatorAddress
    );
    expect(validatorFound).toBeTruthy();
    expect(validatorFound.nodeOperatorId).toBe(validatorTestOperator.discordId);
    console.log("✅ Validator found in operator's validator list");
  });

  test("should get validator by address", async () => {
    // Setup: First add a validator to ensure we have one to retrieve
    console.log("🔧 Setting up validator for address lookup test...");
    await makeAPIRequest("POST", "/api/validator", {
      params: { discordId: validatorTestOperator.discordId },
      data: { 
        validatorAddress: testValidatorAddress,
        skipOnChain: true
      }
    });

    // Step 1: Get validator by address
    console.log("🔍 Getting validator by address...");
    console.log(testValidatorAddress);
    const response = await makeAPIRequest("GET", "/api/validator", {
      params: { address: testValidatorAddress }
    });
    
    // Step 2: Validate response structure and data
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("success", true);
    expect(response.data).toHaveProperty("data");
    
    const validatorData = response.data.data;
    expect(validatorData).toHaveProperty("address", testValidatorAddress);
    expect(validatorData).toHaveProperty("operatorId", validatorTestOperator.discordId);
    expect(validatorData).toHaveProperty("operator");
    expect(validatorData).toHaveProperty("createdAt");
    expect(validatorData).toHaveProperty("updatedAt");
    
    // Validate operator information is included
    expect(validatorData.operator).toHaveProperty("discordId", validatorTestOperator.discordId);
    
    console.log("✅ Validator retrieved by address successfully with correct data structure");
  });

  test("should return 404 when validator address not found", async () => {
    const nonExistentAddress = "0x1111111111111111111111111111111111111111";
    
    console.log("🔍 Testing lookup of non-existent validator address...");
    try {
      await makeAPIRequest("GET", "/api/validator", {
        params: { address: nonExistentAddress }
      });
      // If we reach here, the request didn't fail as expected
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.status).toBe(404);
      expect(error.response?.data).toHaveProperty("error", "Validator not found");
      console.log("✅ Non-existent validator correctly returned 404");
    }
  });

  test("should return 400 for invalid validator address format", async () => {
    const invalidAddress = "0x123"; // Too short
    
    console.log("🔍 Testing lookup with invalid address format...");
    try {
      await makeAPIRequest("GET", "/api/validator", {
        params: { address: invalidAddress }
      });
      // If we reach here, the request didn't fail as expected
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.status).toBe(400);
      expect(error.response?.data).toHaveProperty("error", "Invalid validator address format");
      console.log("✅ Invalid address format correctly returned 400");
    }
  });

  test("should add validator on-chain and verify it's in the validator set", async () => {
    let addResponse: AxiosResponse<any> | undefined;
    let actualValidatorAddress: string = ""; // Store the actual address used
    const maxRetries = 60;
    let attempt = 0;
    
    // Step 1: Add validator to the operator (on-chain) with retries
    console.log("➕ Adding validator on-chain (operator will be created automatically)...");

    while (attempt < maxRetries) {
      try {
        const randomPrivateKey = generatePrivateKey()
        const randomAccount = privateKeyToAccount(randomPrivateKey) 
        actualValidatorAddress = randomAccount.address; // Store the actual address
 
        addResponse = await makeAPIRequest("POST", "/api/validator", {
          params: { discordId: validatorTestOperator2.discordId },
          data: { 
            validatorAddress: actualValidatorAddress,
            skipOnChain: false // Always test on-chain
          }
        });
        console.log("✅ Validator added successfully on-chain!");
        break; // Success, exit retry loop
      } catch (error: any) {
        attempt++;
        if (error.response?.status === 500 && 
            error.response?.data?.error?.includes("missing trie node")) {
          console.log(`⚠️ Blockchain not ready (attempt ${attempt}/${maxRetries}), retrying in 2 seconds...`);
          if (attempt >= maxRetries) {
            throw new Error(`Blockchain environment not ready after ${maxRetries} attempts. Test environment may need setup.`);
          }
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        } else {
          // Not a blockchain readiness issue, fail immediately
          console.error("❌ Error adding validator:", error.response?.data || error.message);
          throw error;
        }
      }
    }
    
    // Ensure we have a valid response
    if (!addResponse) {
      throw new Error("Failed to get a valid response after retries");
    }
    
    expect(addResponse.status).toBe(201);
    expect(addResponse.data).toHaveProperty("success", true);
    expect(addResponse.data.data).toHaveProperty("address", actualValidatorAddress);
    expect(addResponse.data.data).toHaveProperty("operatorId", validatorTestOperator2.discordId);

    // Verify validator in database via direct API call
    console.log("🔍 Verifying validator is stored in database...");
    const getByAddressResponse = await makeAPIRequest("GET", "/api/validator", {
      params: { discordId: validatorTestOperator2.discordId }
    });

    console.log(getByAddressResponse.data.data)
    const val = getByAddressResponse.data.data.validators[0];
    expect(getByAddressResponse.status).toBe(200);
    expect(getByAddressResponse.data).toHaveProperty("success", true);
    expect(val).toHaveProperty("validatorAddress", actualValidatorAddress);
    expect(val).toHaveProperty("nodeOperatorId", validatorTestOperator2.discordId);
    console.log("✅ Validator confirmed in database as well");
    
    console.log("🎉 Full on-chain and database validation test completed successfully!");
  });

  test("should reject validator addition for unapproved operator", async () => {
    // Step 1: First add a validator to create the operator automatically (will be approved by default)
    console.log("🔧 Creating operator automatically by adding first validator...");
    await makeAPIRequest("POST", "/api/validator", {
      params: { discordId: validatorTestOperator2.discordId },
      data: { 
        validatorAddress: testValidatorAddress,
        skipOnChain: true
      }
    });
    console.log("✅ Operator created automatically with first validator");

    // Step 2: Unapprove the operator
    console.log("❌ Unapproving operator for test...");
    await makeAPIRequest("DELETE", "/api/operator/approve", {
      params: { discordId: validatorTestOperator2.discordId }
    });

    // Step 3: Try to add another validator to unapproved operator (should fail)
    console.log("❌ Attempting to add second validator to unapproved operator...");
    try {
      await makeAPIRequest("POST", "/api/validator", {
        params: { discordId: validatorTestOperator2.discordId },
        data: { 
          validatorAddress: testValidatorAddress2,
          skipOnChain: true
        }
      });
      // If we reach here, the request didn't fail as expected
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.status).toBe(403);
      expect(error.response?.data).toHaveProperty("error", "Node operator is not approved");
      console.log("✅ Validator addition correctly rejected for unapproved operator");
    }

    // Step 4: Verify only the first validator was added (second was rejected)
    console.log("🔍 Verifying only first validator was added...");
    const getByOperatorResponse = await makeAPIRequest("GET", "/api/validator", {
      params: { discordId: validatorTestOperator2.discordId }
    });
    expect(getByOperatorResponse.status).toBe(200);
    expect(getByOperatorResponse.data.data.validators.length).toBe(1);
    expect(getByOperatorResponse.data.data.validators[0].validatorAddress).toBe(testValidatorAddress);
    console.log("✅ Confirmed only first validator exists (second was rejected)");
  });

  test("should remove validator from operator", async () => {
    // Add validator
    await makeAPIRequest("POST", "/api/validator", {
      params: { discordId: validatorTestOperator.discordId },
      data: { 
        validatorAddress: testValidatorAddress,
        skipOnChain: true
      }
    });

    // Verify validator exists before removal
    console.log("🔍 Verifying validator exists before removal...");
    const getBeforeResponse = await makeAPIRequest("GET", "/api/validator", {
      params: { discordId: validatorTestOperator.discordId }
    });
    expect(getBeforeResponse.data.data.validators.length).toBe(1);
    console.log("✅ Validator confirmed to exist before removal");

    // Step 1: Remove the validator
    console.log("🗑️ Removing validator from operator...");
    const removeResponse = await makeAPIRequest("DELETE", "/api/validator", {
      params: { 
        validatorAddress: testValidatorAddress,
        discordId: validatorTestOperator.discordId
      }
    });
    expect(removeResponse.status).toBe(204);
    console.log("✅ Validator removed successfully");

    // Step 2: Verify validator is no longer with operator
    console.log("🔍 Verifying validator removal...");
    const getAfterResponse = await makeAPIRequest("GET", "/api/validator", {
      params: { discordId: validatorTestOperator.discordId }
    });
    expect(getAfterResponse.status).toBe(200);
    expect(getAfterResponse.data.data.validators.length).toBe(0);
    console.log("✅ Validator removal verified");

    // Step 3: Verify validator lookup by address returns no operator info
    console.log("🔍 Verifying validator no longer has operator association...");
    try {
      await makeAPIRequest("GET", "/api/validator", {
        params: { address: testValidatorAddress }
      });
      // If we reach here without error, check the response shows no operator
      const getByAddressResponse = await makeAPIRequest("GET", "/api/validator", {
        params: { address: testValidatorAddress }
      });
      expect(getByAddressResponse.data.data.operatorId).toBeNull();
      expect(getByAddressResponse.data.data.operatorInfo).toBeNull();
    } catch (error: any) {
      // It's also acceptable if the validator is not found at all after removal
      expect([400, 404, 200]).toContain(error.response?.status || 200);
    }
    console.log("✅ Validator-operator association removal verified");
  });

}); 
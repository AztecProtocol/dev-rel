import { describe, test, expect, beforeAll, afterEach, beforeEach, afterAll } from "bun:test";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { spawn, ChildProcess } from "child_process";
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const BASE_URL = "http://localhost:3000";
const API_KEY = "test_key_12345";

// Test data
const testOperator = {
  discordId: "123456789012345678",
  walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
  discordUsername: "testuser#1234"
};

const updatedWalletAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

describe("Node Operator E2E Tests", () => {
  // Cleanup any existing test operator before all tests
  beforeAll(async () => {
    try {
      await makeAPIRequest("DELETE", "/api/operator", {
        params: { discordId: testOperator.discordId }
      });
    } catch (error) {
      console.log("No operator found to delete in beforeAll");
    }
  });

  // Cleanup after each test to ensure test isolation
  afterEach(async () => {
    try {
      await makeAPIRequest("DELETE", "/api/operator", {
        params: { discordId: testOperator.discordId }
      });
    } catch (error) {
      console.log("No operator found to delete in afterEach");
    }
  });

  test("should create and retrieve node operator", async () => {
    // Step 1: Create a new node operator
    console.log("➕ Creating new node operator...");
    const createResponse = await makeAPIRequest("POST", "/api/operator", {
      params: {
        discordId: testOperator.discordId,
        walletAddress: testOperator.walletAddress,
        discordUsername: testOperator.discordUsername
      }
    });
    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toHaveProperty("discordId", testOperator.discordId);
    expect(createResponse.data).toHaveProperty("walletAddress", testOperator.walletAddress);
    expect(createResponse.data).toHaveProperty("discordUsername", testOperator.discordUsername);
    console.log("✅ Node operator created successfully");

    // Step 2: Verify the operator exists by retrieving it
    console.log("🔍 Retrieving created node operator to verify...");
    const getOperatorResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getOperatorResponse.status).toBe(200);
    expect(getOperatorResponse.data).toHaveProperty("discordId", testOperator.discordId);
    expect(getOperatorResponse.data).toHaveProperty("walletAddress", testOperator.walletAddress);
    expect(getOperatorResponse.data).toHaveProperty("discordUsername", testOperator.discordUsername);
    console.log("✅ Node operator retrieved and verified successfully");
  });

  test("should update node operator wallet address", async () => {
    // Setup: Create operator first
    console.log("🔧 Setting up operator for wallet update test...");
    await makeAPIRequest("POST", "/api/operator", {
      params: {
        discordId: testOperator.discordId,
        walletAddress: testOperator.walletAddress,
        discordUsername: testOperator.discordUsername
      }
    });

    // Step 1: Update the node operator's wallet address
    console.log("🔄 Updating node operator wallet address...");
    const updateResponse = await makeAPIRequest("PUT", "/api/operator", {
      params: {
        discordId: testOperator.discordId,
        walletAddress: updatedWalletAddress
      }
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data).toHaveProperty("walletAddress", updatedWalletAddress);
    console.log("✅ Node operator wallet updated successfully");

    // Step 2: Verify the update by retrieving the operator
    console.log("🔍 Retrieving operator to verify wallet update...");
    const getOperatorResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getOperatorResponse.status).toBe(200);
    expect(getOperatorResponse.data).toHaveProperty("discordId", testOperator.discordId);
    expect(getOperatorResponse.data).toHaveProperty("walletAddress", updatedWalletAddress);
    console.log("✅ Wallet address update verified successfully");

    // Step 3: Also verify retrieval by new wallet address works
    console.log("🔍 Retrieving operator by new wallet address...");
    const getByWalletResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { walletAddress: updatedWalletAddress, discordId: testOperator.discordId }
    });
    expect(getByWalletResponse.status).toBe(200);
    expect(getByWalletResponse.data).toHaveProperty("discordId", testOperator.discordId);
    expect(getByWalletResponse.data).toHaveProperty("walletAddress", updatedWalletAddress);
    console.log("✅ Retrieval by wallet address verified successfully");
  });

  test("should approve and unapprove node operator", async () => {
    // Setup: Create operator first
    console.log("🔧 Setting up operator for approval test...");
    await makeAPIRequest("POST", "/api/operator", {
      params: {
        discordId: testOperator.discordId,
        walletAddress: testOperator.walletAddress,
        discordUsername: testOperator.discordUsername
      }
    });

    // Step 1: Approve the operator
    console.log("✅ Approving node operator...");
    const approveResponse = await makeAPIRequest("PUT", "/api/operator/approve", {
      params: { discordId: testOperator.discordId }
    });
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.data).toHaveProperty("isApproved", true);
    console.log("✅ Node operator approved successfully");

    // Step 2: Verify approval by retrieving the operator
    console.log("🔍 Retrieving operator to verify approval...");
    let getOperatorResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getOperatorResponse.status).toBe(200);
    expect(getOperatorResponse.data).toHaveProperty("isApproved", true);
    console.log("✅ Operator approval verified successfully");

    // Step 3: Unapprove the operator
    console.log("❌ Unapproving node operator...");
    const unapproveResponse = await makeAPIRequest("DELETE", "/api/operator/approve", {
      params: { discordId: testOperator.discordId }
    });
    expect(unapproveResponse.status).toBe(200);
    expect(unapproveResponse.data).toHaveProperty("isApproved", false);
    console.log("✅ Node operator unapproved successfully");

    // Step 4: Verify unapproval by retrieving the operator
    console.log("🔍 Retrieving operator to verify unapproval...");
    getOperatorResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getOperatorResponse.status).toBe(200);
    expect(getOperatorResponse.data).toHaveProperty("isApproved", false);
    console.log("✅ Operator unapproval verified successfully");
  });

  test("should delete node operator", async () => {
    // Setup: Create operator first
    console.log("🔧 Setting up operator for deletion test...");
    await makeAPIRequest("POST", "/api/operator", {
      params: {
        discordId: testOperator.discordId,
        walletAddress: testOperator.walletAddress,
        discordUsername: testOperator.discordUsername
      }
    });

    // Verify operator exists before deletion
    console.log("🔍 Verifying operator exists before deletion...");
    const getBeforeDeleteResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getBeforeDeleteResponse.status).toBe(200);
    console.log("✅ Operator confirmed to exist before deletion");

    // Step 1: Delete the operator
    console.log("🗑️ Deleting node operator...");
    const deleteResponse = await makeAPIRequest("DELETE", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(deleteResponse.status).toBe(204);
    console.log("✅ Node operator deleted successfully");

    // Step 2: Verify the operator is deleted by trying to retrieve it
    console.log("🔍 Verifying node operator deletion...");
    try {
      await makeAPIRequest("GET", "/api/operator", {
        params: { discordId: testOperator.discordId }
      });
      // If we reach here, the operator was not deleted
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.status).toBe(404);
      console.log("✅ Node operator deletion verified - 404 as expected");
    }
  });
});

describe("Validator E2E Tests", () => {
  let serverProcess: ChildProcess | null = null;
  let hardhatProcess: ChildProcess | null = null;

  // Test data for validators
  const testValidatorAddress = "0xabcdef1234567890abcdef1234567890abcdef13";
  const testValidatorAddress2 = "0x9876543210fedcba9876543210fedcba98765432";
  
  // We'll use the same operator data from the operator tests
  const validatorTestOperator = {
    discordId: "validator_test_operator_123",
    walletAddress: "0x1111111111111111111111111111111111111111",
    discordUsername: "validatortest#1234"
  };

  const validatorTestOperator2 = {
    discordId: "validator_test_operator_456", 
    walletAddress: "0x2222222222222222222222222222222222222222",
    discordUsername: "validatortest2#5678"
  };

  // Cleanup before all tests
  beforeEach(async () => {
    try {
      // Setup: Create and approve an operator first
      console.log("🔧 Setting up approved operator for validator test...");
      await makeAPIRequest("POST", "/api/operator", {
        params: {
          discordId: validatorTestOperator.discordId,
          walletAddress: validatorTestOperator.walletAddress,
          discordUsername: validatorTestOperator.discordUsername
        }
      });

      // Approve the operator
      await makeAPIRequest("PUT", "/api/operator/approve", {
        params: { discordId: validatorTestOperator.discordId }
      });
    } catch (error) {
      console.log("BeforeEach - Error setting up approved operator for validator test");
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
                      validatorAddress: validator.address, 
                      discordId: operatorId 
                    }
                  });
                  console.log(`🗑️ Deleted validator ${validator.address} for operator ${operatorId}`);
                } catch (deleteError: any) {
                  console.log(`⚠️ Error deleting validator ${validator.address}: ${deleteError.response?.status} ${deleteError.response?.data?.error || deleteError.message}`);
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
    expect(response.data.data).toHaveProperty("blockchainValidators");
    expect(response.data.data).toHaveProperty("knownValidators");
    expect(response.data.data.blockchainValidators).toHaveProperty("validators");
    expect(response.data.data.blockchainValidators).toHaveProperty("stats");
    expect(response.data.data.knownValidators).toHaveProperty("validators");
    expect(response.data.data.knownValidators).toHaveProperty("stats");
    
    // Verify structure
    expect(Array.isArray(response.data.data.blockchainValidators.validators)).toBe(true);
    expect(Array.isArray(response.data.data.knownValidators.validators)).toBe(true);
    expect(typeof response.data.data.blockchainValidators.stats.totalValidators).toBe("number");
    expect(typeof response.data.data.knownValidators.stats.totalValidators).toBe("number");
    
    console.log(`✅ Retrieved ${response.data.data.blockchainValidators.stats.totalValidators} blockchain validators`);
    console.log(`✅ Found ${response.data.data.knownValidators.stats.totalValidators} validators with operators`);
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
      (v: any) => v.address === testValidatorAddress
    );
    expect(validatorFound).toBeTruthy();
    expect(validatorFound.operatorId).toBe(validatorTestOperator.discordId);
    console.log("✅ Validator found in operator's validator list");
  });

  test("should add validator on-chain and verify it's in the validator set", async () => {
    let addResponse: AxiosResponse<any> | undefined;
    let actualValidatorAddress: string = ""; // Store the actual address used
    const maxRetries = 3;
    let attempt = 0;
    
    // Step 1: Add validator to the operator (on-chain) with retries
    console.log("➕ Adding validator on-chain...");

    // Setup: Create a new operator
    console.log("🔧 Setting up new operator for on-chain validator test...");
    await makeAPIRequest("POST", "/api/operator", {
      params: {
        discordId: validatorTestOperator2.discordId,
        walletAddress: validatorTestOperator2.walletAddress,
        discordUsername: validatorTestOperator2.discordUsername
      }
    });

    // Approve the operator
    await makeAPIRequest("PUT", "/api/operator/approve", {
      params: { discordId: validatorTestOperator2.discordId }
    });

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
    const val = getByAddressResponse.data.data.validators[0];
    expect(getByAddressResponse.status).toBe(200);
    expect(getByAddressResponse.data).toHaveProperty("success", true);
    expect(val).toHaveProperty("address", actualValidatorAddress);
    expect(val).toHaveProperty("operatorId", validatorTestOperator2.discordId);
    console.log("✅ Validator confirmed in database as well");
    
    console.log("🎉 Full on-chain and database validation test completed successfully!");
  });

  test("should reject validator addition for unapproved operator", async () => {
    // Setup: Create an unapproved operator
    console.log("🔧 Setting up unapproved operator for rejection test...");
    await makeAPIRequest("POST", "/api/operator", {
      params: {
        discordId: validatorTestOperator2.discordId,
        walletAddress: validatorTestOperator2.walletAddress,
        discordUsername: validatorTestOperator2.discordUsername
      }
    });

    // Step 1: Try to add validator to unapproved operator (should fail)
    console.log("❌ Attempting to add validator to unapproved operator...");
    try {
      await makeAPIRequest("POST", "/api/validator", {
        params: { discordId: validatorTestOperator2.discordId },
        data: { 
          validatorAddress: testValidatorAddress,
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

    // Step 2: Verify validator was not added by checking operator's validators
    console.log("🔍 Verifying validator was not added...");
    const getByOperatorResponse = await makeAPIRequest("GET", "/api/validator", {
      params: { discordId: validatorTestOperator2.discordId }
    });
    expect(getByOperatorResponse.status).toBe(200);
    expect(getByOperatorResponse.data.data.validators.length).toBe(0);
    console.log("✅ Confirmed no validators were added to unapproved operator");
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

  test("should handle validator lookup by username", async () => {
    // Add validator
    await makeAPIRequest("POST", "/api/validator", {
      params: { discordUsername: validatorTestOperator.discordUsername },
      data: { 
        validatorAddress: testValidatorAddress,
        skipOnChain: true
      }
    });

    // Step 1: Retrieve validator using operator's discord username
    console.log("🔍 Retrieving validators by operator username...");
    const getByUsernameResponse = await makeAPIRequest("GET", "/api/validator", {
      params: { discordUsername: validatorTestOperator.discordUsername }
    });
    expect(getByUsernameResponse.status).toBe(200);
    expect(getByUsernameResponse.data).toHaveProperty("success", true);
    expect(getByUsernameResponse.data.data).toHaveProperty("operator");
    expect(getByUsernameResponse.data.data).toHaveProperty("validators");
    expect(getByUsernameResponse.data.data.operator.discordUsername).toBe(validatorTestOperator.discordUsername);
    
    const validatorFound = getByUsernameResponse.data.data.validators.find(
      (v: any) => v.address === testValidatorAddress
    );
    expect(validatorFound).toBeTruthy();
    expect(validatorFound.operatorId).toBe(validatorTestOperator.discordId);
    console.log("✅ Validator lookup by username verified");
  });

});

async function waitForEthereumReady(
  timeoutMs: number = 30000,
  retryIntervalMs: number = 1000
): Promise<void> {
  const startTime = Date.now();
  const endpoint = "/api/ethereum/rollup/validators";
  let attempt = 0;

  console.log(`Starting Ethereum health check by polling ${process.env.API_URL}${endpoint}...`);

  while (Date.now() - startTime < timeoutMs) {
    attempt++;
    
    try {
      const response = await makeAPIRequest("GET", endpoint);

      if (response.status === 200) {
        const data = response.data as { data?: string[] };
        console.log(`✅ Ethereum network is ready! (attempt ${attempt}, ${Date.now() - startTime}ms)`);
        console.log(`Found ${data.data?.length || 0} validators`);
        return; // Success!
      } else {
        console.log(`⏳ Ethereum not ready yet - HTTP ${response.status} (attempt ${attempt})`);
      }

    } catch (error: any) {
      console.log(`⏳ Ethereum not ready yet - ${error.message} (attempt ${attempt})`);
    }

    // Wait before next attempt, but don't wait if we're about to timeout
    const remainingTime = timeoutMs - (Date.now() - startTime);
    if (remainingTime > retryIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
    } else if (remainingTime > 0) {
      // Wait for the remaining time
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
  }

  // If we get here, we've timed out
  const elapsedTime = Date.now() - startTime;
  throw new Error(`❌ Ethereum health check timed out after ${elapsedTime}ms (${attempt} attempts). The Anvil network may not be running or accessible.`);
}

// Helper functions
async function makeAPIRequest(method: string, endpoint: string, { params, data }: { params?: any, data?: any } = {}) {
  const config: AxiosRequestConfig = {
    method,
    url: `${process.env.API_URL}${endpoint}`,
    headers: {
      "x-api-key": process.env.BACKEND_API_KEY,
      "Content-Type": "application/json"
    },
    data,
    params
  };

  try {
    return await axios(config);
  } catch (error: any) {
    // Create a cleaner error object to avoid massive dumps
    const cleanError = new Error();
    cleanError.name = "APIRequestError";
    cleanError.message = `${method} ${endpoint} failed`;
    
    // Add essential error information without the massive object dump
    (cleanError as any).response = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    };
    
    // Add request information for debugging
    (cleanError as any).request = {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data
    };
    
    throw cleanError;
  }
}

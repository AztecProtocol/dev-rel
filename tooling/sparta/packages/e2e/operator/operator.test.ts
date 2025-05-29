import { describe, test, expect, beforeAll, afterEach } from "bun:test";
import { 
  testOperator, 
  updatedWalletAddress, 
  makeAPIRequest 
} from "../shared/utils.js";

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
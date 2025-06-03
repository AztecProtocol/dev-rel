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
        discordId: testOperator.discordId
      }
    });
    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toHaveProperty("discordId", testOperator.discordId);
    expect(createResponse.data).toHaveProperty("isApproved", true);
    console.log("✅ Node operator created successfully");

    // Step 2: Verify the operator exists by retrieving it
    console.log("🔍 Retrieving created node operator to verify...");
    const getOperatorResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getOperatorResponse.status).toBe(200);
    expect(getOperatorResponse.data).toHaveProperty("discordId", testOperator.discordId);
    expect(getOperatorResponse.data).toHaveProperty("isApproved", true);
    console.log("✅ Node operator retrieved and verified successfully");
  });

  test("should verify operator is approved by default and can be unapproved", async () => {
    // Setup: Create operator first
    console.log("🔧 Setting up operator for approval test...");
    const createResponse = await makeAPIRequest("POST", "/api/operator", {
      params: {
        discordId: testOperator.discordId
      }
    });
    
    // Verify operator is created with isApproved=true by default
    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toHaveProperty("isApproved", true);
    console.log("✅ Node operator created with isApproved=true by default");

    // Step 1: Verify approval by retrieving the operator
    console.log("🔍 Retrieving operator to verify approval...");
    let getOperatorResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getOperatorResponse.status).toBe(200);
    expect(getOperatorResponse.data).toHaveProperty("isApproved", true);
    console.log("✅ Operator approval verified successfully");

    // Step 2: Unapprove the operator
    console.log("❌ Unapproving node operator...");
    const unapproveResponse = await makeAPIRequest("DELETE", "/api/operator/approve", {
      params: { discordId: testOperator.discordId }
    });
    expect(unapproveResponse.status).toBe(200);
    expect(unapproveResponse.data).toHaveProperty("isApproved", false);
    console.log("✅ Node operator unapproved successfully");

    // Step 3: Verify unapproval by retrieving the operator
    console.log("🔍 Retrieving operator to verify unapproval...");
    getOperatorResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getOperatorResponse.status).toBe(200);
    expect(getOperatorResponse.data).toHaveProperty("isApproved", false);
    console.log("✅ Operator unapproval verified successfully");

    // Step 4: Re-approve the operator
    console.log("✅ Re-approving node operator...");
    const approveResponse = await makeAPIRequest("PUT", "/api/operator/approve", {
      params: { discordId: testOperator.discordId }
    });
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.data).toHaveProperty("isApproved", true);
    console.log("✅ Node operator re-approved successfully");

    // Step 5: Verify re-approval
    console.log("🔍 Retrieving operator to verify re-approval...");
    getOperatorResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getOperatorResponse.status).toBe(200);
    expect(getOperatorResponse.data).toHaveProperty("isApproved", true);
    console.log("✅ Operator re-approval verified successfully");
  });

  test("should delete node operator", async () => {
    // Setup: Create operator first
    console.log("🔧 Setting up operator for deletion test...");
    await makeAPIRequest("POST", "/api/operator", {
      params: {
        discordId: testOperator.discordId
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

  test("should fail to create operator with missing parameters", async () => {
    // Test that providing no discordId fails
    console.log("❌ Testing creation with missing parameters...");
    try {
      await makeAPIRequest("POST", "/api/operator", {
        params: {
          // No discordId provided
        }
      });
      // If we reach here, the request should have failed
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.status).toBe(400);
      expect(error.response?.data?.error).toContain("discordId must be provided");
      console.log("✅ Request correctly failed with missing parameters");
    }
  });
}); 
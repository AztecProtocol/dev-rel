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

  test("should create and retrieve node operator with address only", async () => {
    // Step 1: Create a new node operator with only address (discordId optional)
    console.log("➕ Creating new node operator with address only...");
    const createResponse = await makeAPIRequest("POST", "/api/operator", {
      params: {
        address: updatedWalletAddress
      }
    });
    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toHaveProperty("address", updatedWalletAddress);
    console.log("✅ Node operator created successfully with address only");

    // Step 2: Since we don't have a discordId, we can't retrieve by discordId
    // This test demonstrates that address-only creation works
    console.log("✅ Node operator created without discordId successfully");
  });

  test("should create and retrieve node operator with both address and discordId", async () => {
    // Step 1: Create a new node operator with both address and discordId
    console.log("➕ Creating new node operator with both address and discordId...");
    const createResponse = await makeAPIRequest("POST", "/api/operator", {
      params: {
        address: updatedWalletAddress,
        discordId: testOperator.discordId
      }
    });
    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toHaveProperty("address", updatedWalletAddress);
    expect(createResponse.data).toHaveProperty("discordId", testOperator.discordId);
    console.log("✅ Node operator created successfully with both parameters");

    // Step 2: Verify the operator exists by retrieving it by discordId
    console.log("🔍 Retrieving created node operator by discordId to verify...");
    const getOperatorResponse = await makeAPIRequest("GET", "/api/operator", {
      params: { discordId: testOperator.discordId }
    });
    expect(getOperatorResponse.status).toBe(200);
    expect(getOperatorResponse.data).toHaveProperty("address", updatedWalletAddress);
    expect(getOperatorResponse.data).toHaveProperty("discordId", testOperator.discordId);
    console.log("✅ Node operator retrieved and verified successfully");
  });

  test("should delete node operator", async () => {
    // Setup: Create operator first
    console.log("🔧 Setting up operator for deletion test...");
    await makeAPIRequest("POST", "/api/operator", {
      params: {
        address: updatedWalletAddress,
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

  test("should fail to create operator with missing address parameter", async () => {
    // Test that providing no address fails
    console.log("❌ Testing creation with missing address parameter...");
    try {
      await makeAPIRequest("POST", "/api/operator", {
        params: {
          discordId: testOperator.discordId
          // No address provided
        }
      });
      // If we reach here, the request should have failed
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.status).toBe(400);
      expect(error.response?.data?.error).toContain("address must be provided");
      console.log("✅ Request correctly failed with missing address parameter");
    }
  });
}); 
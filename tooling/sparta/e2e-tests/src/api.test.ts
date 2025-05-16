import { test, expect, describe, beforeAll, afterAll, mock } from "bun:test";
import { Server } from "bun";

// Mock the actual server module - in real e2e, you'd use the actual server or a test instance
let mockServer: Server | null = null;
const mockPort = 3456;
const baseUrl = `http://localhost:${mockPort}`;

// Creating a simple mock for the API
const startMockServer = () => {
  return Bun.serve({
    port: mockPort,
    fetch(req) {
      const url = new URL(req.url);
      
      // Mock endpoints
      if (url.pathname === "/api/health") {
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      
      if (url.pathname === "/api/users" && req.method === "GET") {
        return new Response(JSON.stringify([
          { id: 1, name: "User 1" },
          { id: 2, name: "User 2" }
        ]), {
          headers: { "Content-Type": "application/json" },
        });
      }
      
      return new Response("Not found", { status: 404 });
    },
  });
};

describe("API Service E2E Tests", () => {
  beforeAll(() => {
    // Start a mock server for testing
    mockServer = startMockServer();
    console.log(`Mock API server listening at ${baseUrl}`);
  });

  afterAll(() => {
    // Clean up: close the server
    if (mockServer) {
      mockServer.stop();
      console.log("Mock API server stopped");
    }
  });

  test("Health endpoint returns 200 OK", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({ status: "ok" });
  });

  test("Users endpoint returns list of users", async () => {
    const response = await fetch(`${baseUrl}/api/users`);
    expect(response.status).toBe(200);
    
    const users = await response.json();
    expect(users).toBeArray();
    expect(users.length).toBe(2);
    expect(users[0]).toHaveProperty("id");
    expect(users[0]).toHaveProperty("name");
  });

  test("Non-existent endpoint returns 404", async () => {
    const response = await fetch(`${baseUrl}/api/non-existent`);
    expect(response.status).toBe(404);
  });
}); 
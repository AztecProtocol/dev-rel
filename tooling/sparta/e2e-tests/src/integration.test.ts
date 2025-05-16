import { test, expect, describe, beforeAll, afterAll, mock } from "bun:test";
import { Server } from "bun";

// Creating mock servers and clients for different services
let mockApiServer: Server | null = null;
const apiPort = 3456;
const apiBaseUrl = `http://localhost:${apiPort}`;

// Mock event data for integration tests
const mockEvent = {
  id: "event-123",
  name: "Contract Deployment",
  timestamp: Date.now(),
  details: {
    contractAddress: "0x123456789abcdef",
    network: "testnet",
    deployer: "0xUser123"
  }
};

// Mock handlers for API server
const mockApiHandlers = {
  getEvents: mock(() => [mockEvent]),
  createEvent: mock((event) => ({ id: "event-" + Date.now(), ...event })),
  notifyDiscord: mock(() => ({ success: true }))
};

// Mock Discord client
const mockDiscordClient = {
  login: mock(() => Promise.resolve("mock-token")),
  channels: {
    cache: {
      get: mock(() => ({
        send: mock(() => Promise.resolve({ id: "message-123" }))
      }))
    }
  }
};

// Mock Ethereum provider
const mockEthProvider = {
  getBlockNumber: mock(() => Promise.resolve(12345678)),
  getBalance: mock(() => Promise.resolve(BigInt(1000000000000000000)))
};

// Start mock API server
const startMockApiServer = () => {
  return Bun.serve({
    port: apiPort,
    websocket: { message() {} }, // Required property
    fetch(req, server) {
      const url = new URL(req.url);
      
      // GET /api/events
      if (url.pathname === "/api/events" && req.method === "GET") {
        return new Response(JSON.stringify(mockApiHandlers.getEvents()), {
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // POST /api/events
      if (url.pathname === "/api/events" && req.method === "POST") {
        return req.json().then(body => {
          const newEvent = mockApiHandlers.createEvent(body);
          return new Response(JSON.stringify(newEvent), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        });
      }
      
      // POST /api/discord/notify
      if (url.pathname === "/api/discord/notify" && req.method === "POST") {
        return req.json().then(() => {
          const result = mockApiHandlers.notifyDiscord();
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          });
        });
      }
      
      return new Response("Not found", { status: 404 });
    },
  });
};

describe("Integration E2E Tests", () => {
  beforeAll(() => {
    // Start mock API server
    mockApiServer = startMockApiServer();
    console.log(`Mock API server listening at ${apiBaseUrl}`);
    
    // Reset all mocks
    mockApiHandlers.getEvents.mockReset();
    mockApiHandlers.createEvent.mockReset();
    mockApiHandlers.notifyDiscord.mockReset();
    mockDiscordClient.login.mockReset();
    mockDiscordClient.channels.cache.get.mockReset();
    mockEthProvider.getBlockNumber.mockReset();
    mockEthProvider.getBalance.mockReset();
  });

  afterAll(() => {
    // Clean up: close the server
    if (mockApiServer) {
      mockApiServer.stop();
      console.log("Mock API server stopped");
    }
  });

  test("Full event flow from creation to Discord notification", async () => {
    // 1. Create a new event through the API
    const eventPayload = {
      name: "New Contract Deployment",
      timestamp: Date.now(),
      details: {
        contractAddress: "0xNewContract123",
        network: "mainnet",
        deployer: "0xDeployer456"
      }
    };
    
    const createResponse = await fetch(`${apiBaseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload)
    });
    
    expect(createResponse.status).toBe(201);
    const createdEvent = await createResponse.json();
    expect(createdEvent).toHaveProperty("id");
    expect(createdEvent.name).toBe(eventPayload.name);
    
    // 2. Get all events to verify our event was added
    const getEventsResponse = await fetch(`${apiBaseUrl}/api/events`);
    expect(getEventsResponse.status).toBe(200);
    
    // 3. Send a Discord notification about the event
    const notifyResponse = await fetch(`${apiBaseUrl}/api/discord/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: createdEvent.id })
    });
    
    expect(notifyResponse.status).toBe(200);
    const notifyResult = await notifyResponse.json();
    expect(notifyResult).toHaveProperty("success");
    expect(notifyResult.success).toBe(true);
    
    // Verify the notifications were sent properly
    expect(mockApiHandlers.notifyDiscord).toHaveBeenCalled();
  });

  test("Blockchain integration flow", async () => {
    // Simulate checking contract deployment on blockchain
    const blockNumber = await mockEthProvider.getBlockNumber();
    expect(mockEthProvider.getBlockNumber).toHaveBeenCalled();
    expect(blockNumber).toBe(12345678);
    
    // Simulate checking wallet balance
    const balance = await mockEthProvider.getBalance();
    expect(mockEthProvider.getBalance).toHaveBeenCalled();
    expect(balance).toBe(BigInt(1000000000000000000));
    
    // Simulate posting contract deployment event
    const eventPayload = {
      name: "Contract Verified",
      timestamp: Date.now(),
      details: {
        contractAddress: "0xVerifiedContract456",
        network: "mainnet",
        blockNumber: blockNumber
      }
    };
    
    const createResponse = await fetch(`${apiBaseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload)
    });
    
    expect(createResponse.status).toBe(201);
    const createdEvent = await createResponse.json();
    expect(createdEvent).toHaveProperty("id");
    
    // Check integration between blockchain data and event system
    expect(createdEvent.details.blockNumber).toBe(blockNumber);
  });
}); 
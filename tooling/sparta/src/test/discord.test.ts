import { expect, test, beforeAll, describe, mock, Mock } from "bun:test";
import { Discord } from "../clients/discord.js";
import {
	Client,
	Collection,
	GatewayIntentBits,
	MessageFlags,
	REST,
	Routes,
} from "discord.js";
import { config } from "dotenv";

config({ path: ".env.local" });

// Mock Discord.js components
mock.module("discord.js", () => {
	// Create mock client class
	const mockClient = {
		login: mock(() => Promise.resolve("token")),
		once: mock(),
		on: mock(),
		commands: new Collection(),
		guilds: {
			fetch: mock(() => Promise.resolve({ id: "mock-guild" })),
		},
	};

	return {
		Client: mock(() => mockClient),
		Collection,
		GatewayIntentBits: {
			Guilds: 1,
			GuildMessages: 2,
		},
		MessageFlags: {
			Ephemeral: 64,
		},
		REST: mock(() => ({
			setToken: mock().mockReturnThis(),
			put: mock(() => Promise.resolve()),
		})),
		Routes: {
			applicationGuildCommands: mock(
				(clientId, guildId) =>
					`/applications/${clientId}/guilds/${guildId}/commands`
			),
		},
	};
});

describe("Discord Client Tests", () => {
	// Keep reference to any mock clients created during tests
	let mockDiscordClient: any;

	test("Discord.new() initializes client with correct configuration", async () => {
		// Store original environment variables
		const originalToken = process.env.BOT_TOKEN;
		const originalClientId = process.env.BOT_CLIENT_ID;
		const originalGuildId = process.env.GUILD_ID;

		// Set test environment variables
		process.env.BOT_TOKEN = "test-token";
		process.env.BOT_CLIENT_ID = "test-client-id";
		process.env.GUILD_ID = "test-guild-id";

		try {
			const discord = await Discord.new();
			expect(discord).toBeInstanceOf(Discord);

			// Verify the client was initialized
			mockDiscordClient = discord.getClient();
			expect(mockDiscordClient).toBeDefined();
			expect(mockDiscordClient.login).toHaveBeenCalledWith("test-token");
			expect(mockDiscordClient.once).toHaveBeenCalledWith(
				"ready",
				expect.any(Function)
			);
			expect(mockDiscordClient.once).toHaveBeenCalledWith(
				"error",
				expect.any(Function)
			);
			expect(mockDiscordClient.on).toHaveBeenCalledWith(
				"interactionCreate",
				expect.any(Function)
			);
		} finally {
			// Restore original environment variables
			process.env.BOT_TOKEN = originalToken;
			process.env.BOT_CLIENT_ID = originalClientId;
			process.env.GUILD_ID = originalGuildId;
		}
	});

	test("getClient() returns the Discord client instance", async () => {
		const discord = await Discord.new();
		const client = discord.getClient();
		expect(client).toBeDefined();
		expect(client.commands).toBeInstanceOf(Collection);
	});

	test("getGuild() retrieves guild by ID", async () => {
		const discord = await Discord.new();
		const guild = await discord.getGuild("test-guild-id");
		expect(guild).toBeDefined();
		expect(mockDiscordClient.guilds.fetch).toHaveBeenCalledWith(
			"test-guild-id"
		);
	});

	test("handles errors gracefully during initialization", async () => {
		// Force an error condition by removing the token
		const originalToken = process.env.BOT_TOKEN;
		process.env.BOT_TOKEN = undefined;

		try {
			// Get a reference to the login function so we can modify it
			const client = new Client({ intents: [] });
			const loginSpy = mock(() =>
				Promise.reject(new Error("Invalid token"))
			);
			client.login = loginSpy;

			// @ts-expect-error - accessing private property for test
			Client.mockImplementationOnce(() => client);

			await expect(Discord.new()).rejects.toThrow();
			expect(loginSpy).toHaveBeenCalled();
		} finally {
			// Restore original token
			process.env.BOT_TOKEN = originalToken;
		}
	});
});

import { describe, test, expect, mock } from "bun:test";
import { addValidator } from "../addValidator.js";
import { adminValidators } from "../adminValidators.js";
import { DiscordInteraction } from "../../types/discord.js";
import { ApplicationCommandOptionType } from "../../types/discord.js";

// Mock the services
const mockValidatorService = {
	addValidator: mock(() => Promise.resolve()),
	removeValidator: mock(() => Promise.resolve()),
};

const mockChainInfoService = {
	getInfo: mock(() =>
		Promise.resolve({
			validators: ["MOCK-0x123", "MOCK-0x456"],
			committee: ["MOCK-0x123"],
			archive: [],
			pendingBlockNum: "MOCK-1",
			provenBlockNum: "MOCK-1",
			currentEpoch: "MOCK-1",
			currentSlot: "MOCK-1",
			proposerNow: "MOCK-0x123",
		})
	),
};

mock.module("../../services/validator-service.js", () => ({
	ValidatorService: mockValidatorService,
}));

mock.module("../../services/chaininfo-service.js", () => ({
	ChainInfoService: mockChainInfoService,
}));

describe("Discord Commands", () => {
	describe("addValidator", () => {
		test("should add a validator with valid address", async () => {
			const interaction: DiscordInteraction = {
				data: {
					name: "add-validator",
					options: [
						{
							name: "address",
							value: "0x123",
							type: ApplicationCommandOptionType.STRING,
						},
					],
				},
			};

			const response = await addValidator.execute(interaction);
			expect(response.data.content).toBe("MOCK - Added validator 0x123");
		});

		test("should handle missing address", async () => {
			const interaction: DiscordInteraction = {
				data: {
					name: "add-validator",
					options: [],
				},
			};

			const response = await addValidator.execute(interaction);
			expect(response.data.content).toBe(
				"MOCK - Please provide an address to add"
			);
		});
	});

	describe("adminValidators", () => {
		test("should get committee list", async () => {
			const interaction: DiscordInteraction = {
				data: {
					name: "admin",
					options: [
						{
							name: "committee",
							type: ApplicationCommandOptionType.SUB_COMMAND_GROUP,
							options: [
								{
									name: "get",
									type: ApplicationCommandOptionType.SUB_COMMAND,
									options: [],
								},
							],
						},
					],
				},
			};

			const response = await adminValidators.execute(interaction);
			expect(response.data.content).toContain(
				"MOCK - Committee total: 1"
			);
			expect(response.data.content).toContain("MOCK-0x123");
		});

		test("should get validators list", async () => {
			const interaction: DiscordInteraction = {
				data: {
					name: "admin",
					options: [
						{
							name: "validators",
							type: ApplicationCommandOptionType.SUB_COMMAND_GROUP,
							options: [
								{
									name: "get",
									type: ApplicationCommandOptionType.SUB_COMMAND,
									options: [],
								},
							],
						},
					],
				},
			};

			const response = await adminValidators.execute(interaction);
			expect(response.data.content).toContain(
				"MOCK - Validators total: 2"
			);
			expect(response.data.content).toContain("MOCK-0x123");
			expect(response.data.content).toContain("MOCK-0x456");
		});

		test("should remove validator", async () => {
			const interaction: DiscordInteraction = {
				data: {
					name: "admin",
					options: [
						{
							name: "validators",
							type: ApplicationCommandOptionType.SUB_COMMAND_GROUP,
							options: [
								{
									name: "remove",
									type: ApplicationCommandOptionType.SUB_COMMAND,
									options: [
										{
											name: "address",
											value: "0x123",
											type: ApplicationCommandOptionType.STRING,
										},
									],
								},
							],
						},
					],
				},
			};

			const response = await adminValidators.execute(interaction);
			expect(response.data.content).toBe(
				"MOCK - Removed validator 0x123"
			);
		});

		test("should handle invalid command structure", async () => {
			const interaction: DiscordInteraction = {
				data: {
					name: "admin",
					options: [],
				},
			};

			const response = await adminValidators.execute(interaction);
			expect(response.data.content).toBe(
				"MOCK - Invalid command structure"
			);
		});

		test("should handle service errors", async () => {
			const error = new Error("Service error");
			const errorMockValidatorService = {
				addValidator: mock(() => Promise.reject(error)),
				removeValidator: mock(() => Promise.reject(error)),
			};

			mock.module("../../services/validator-service.js", () => ({
				ValidatorService: errorMockValidatorService,
			}));

			const interaction: DiscordInteraction = {
				data: {
					name: "add-validator",
					options: [
						{
							name: "address",
							value: "0x123",
							type: ApplicationCommandOptionType.STRING,
						},
					],
				},
			};

			const response = await addValidator.execute(interaction);
			expect(response.data.content).toBe(
				"MOCK - Failed to add validator: Service error"
			);
		});
	});
});

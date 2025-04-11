import { expect, test, beforeAll, describe, mock } from "bun:test";
import { Ethereum, getExpectedAddress } from "../clients/ethereum.js";
import { config } from "dotenv";

config({ path: ".env.local" });

// Mock viem and its functions
mock.module("viem", () => {
	const mockPublicClient = {
		waitForTransactionReceipt: mock(({ hash }) =>
			Promise.resolve({
				blockHash: "0xblock123",
				blockNumber: 123456n,
				transactionHash: hash,
				status: "success",
			})
		),
	};

	const mockContract = {
		address: "0xcontract123" as `0x${string}`,
		write: {
			mint: mock(() => "0xtxhash123"),
			approve: mock(() => "0xtxhash456"),
			deposit: mock(() => "0xtxhash789"),
			initiateWithdraw: mock(() => "0xtxhash000"),
		},
		read: {
			getRollup: mock(() => "0xrollup123"),
			getStakingAsset: mock(() => "0xstaking123"),
		},
	};

	const mockWalletClient = {
		account: {
			address: "0xwallet123" as `0x${string}`,
		},
	};

	return {
		createPublicClient: mock((config) => mockPublicClient),
		createWalletClient: mock(() => mockWalletClient),
		encodeDeployData: mock(() => "0xencoded123"),
		getContract: mock(() => mockContract),
		getCreate2Address: mock(() => "0xcreated123"),
		http: mock(() => "http-transport"),
		padHex: mock(() => "0xpadded123"),
	};
});

// Mock viem/accounts
mock.module("viem/accounts", () => {
	return {
		privateKeyToAccount: mock(() => ({
			address: "0xaccount123" as `0x${string}`,
		})),
	};
});

describe("Ethereum Integration Tests", () => {
	let ethereum: Ethereum;

	// Set environment variables for tests
	const testEnv = {
		ETHEREUM_HOST: "https://test-rpc-url",
		ETHEREUM_REGISTRY_ADDRESS: "0xregistry123",
		MINTER_PRIVATE_KEY: "0xprivkey123",
		MINIMUM_STAKE: "1000000",
		APPROVAL_AMOUNT: "2000000",
		WITHDRAWER_ADDRESS: "0xwithdrawer123",
		WITHDRAWER_PRIVATE_KEY: "0xwithdrawerprivkey123",
		L1_CHAIN_ID: "11155111",
	};

	beforeAll(() => {
		// Save original env variables
		const originalEnv = { ...process.env };

		// Set test env variables
		Object.entries(testEnv).forEach(([key, value]) => {
			process.env[key] = value;
		});

		return () => {
			// Restore original env variables
			process.env = originalEnv;
		};
	});

	test("Ethereum.new() initializes client with correct configuration", async () => {
		const ethereum = await Ethereum.new();
		expect(ethereum).toBeInstanceOf(Ethereum);

		// Check if required clients were initialized
		const viem = await import("viem");
		expect(viem.createPublicClient).toHaveBeenCalled();
		expect(viem.createWalletClient).toHaveBeenCalled();
		expect(viem.getContract).toHaveBeenCalled();
	});

	test("getPublicClient() returns the public client", async () => {
		ethereum = await Ethereum.new();
		const client = ethereum.getPublicClient();
		expect(client).toBeDefined();
		expect(client.waitForTransactionReceipt).toBeDefined();
	});

	test("getWalletClient() returns the wallet client", async () => {
		ethereum = await Ethereum.new();
		const client = ethereum.getWalletClient();
		expect(client).toBeDefined();
		expect(client.account).toBeDefined();
	});

	test("getRollup() returns the rollup contract", async () => {
		ethereum = await Ethereum.new();
		const rollup = ethereum.getRollup();
		expect(rollup).toBeDefined();
		expect(rollup.address).toBe("0xcontract123");
	});

	test("stakingAssetFaucet() mints tokens", async () => {
		ethereum = await Ethereum.new();
		const receipt = await ethereum.stakingAssetFaucet("0xrecipient123");

		expect(receipt).toBeDefined();
		expect(receipt.transactionHash).toBe("0xtxhash123");
		expect(receipt.status).toBe("success");
	});

	test("addValidator() deposits stake for a validator", async () => {
		ethereum = await Ethereum.new();
		const receipts = await ethereum.addValidator("0xvalidator123");

		expect(receipts).toBeInstanceOf(Array);
		expect(receipts.length).toBe(2);
		expect(receipts[0].transactionHash).toBe("0xtxhash456");
		expect(receipts[1].transactionHash).toBe("0xtxhash789");
	});

	test("removeValidator() initiates withdrawal for a validator", async () => {
		ethereum = await Ethereum.new();
		const receipt = await ethereum.removeValidator("0xvalidator123");

		expect(receipt).toBeDefined();
		expect(receipt.transactionHash).toBe("0xtxhash000");
		expect(receipt.status).toBe("success");
	});

	test("getExpectedAddress calculates the correct address", () => {
		const result = getExpectedAddress(
			["0xarg123"] as [`0x${string}`],
			"0xsalt123" as `0x${string}`
		);

		expect(result).toBeDefined();
		expect(result.address).toBe("0xcreated123");
		expect(result.paddedSalt).toBe("0xpadded123");
		expect(result.calldata).toBe("0xencoded123");
	});

	test("handles errors gracefully", async () => {
		// Mock waitForTransactionReceipt to throw an error
		const viem = await import("viem");

		// Create a mock chain object with required properties
		const mockChain = {
			id: 11155111,
			name: "Sepolia",
			nativeCurrency: {
				decimals: 18,
				name: "Ethereum",
				symbol: "ETH",
			},
			rpcUrls: {
				default: {
					http: ["https://test-rpc-url"],
				},
				public: {
					http: ["https://test-rpc-url"],
				},
			},
		};

		// Create a mock http transport
		const httpTransport = viem.http();

		const mockPublicClient = viem.createPublicClient({
			chain: mockChain,
			transport: httpTransport,
		});

		mockPublicClient.waitForTransactionReceipt = mock(() => {
			throw new Error("Transaction failed");
		});

		ethereum = await Ethereum.new();

		// @ts-expect-error - accessing private property for test
		ethereum.publicClient = mockPublicClient;

		await expect(
			ethereum.stakingAssetFaucet("0xrecipient123")
		).rejects.toThrow("Transaction failed");
	});
});

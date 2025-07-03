/**
 * @fileoverview Ethereum client and utilities
 * @description Provides Ethereum client configuration and interaction methods
 * @module sparta/utils/ethereum
 */

import {
	createPublicClient,
	createWalletClient,
	getContract,
	http,
	TransactionReceipt,
} from "viem";

import { RollupAbi } from "../utils/abis/rollup.js";
import { TestERC20Abi } from "../utils/abis/testERC20Abi.js";
import { RegistryAbi } from "../utils/abis/registryAbi.js";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { logger } from "../utils/logger.js";

/**
 * Ethereum chain configuration
 * @const {Object} ethereumChain
 */
const ethereumChain = {
	id: parseInt(process.env.L1_CHAIN_ID as string),
	name: "Sepolia",
	network: "sepolia",
	nativeCurrency: {
		decimals: 18,
		name: "Ethereum",
		symbol: "ETH",
	},
	rpcUrls: {
		default: {
			http: [process.env.ETHEREUM_HOST as string],
		},
		public: {
			http: [process.env.ETHEREUM_HOST as string],
		},
	},
} as const;

export class Ethereum {
	constructor(
		private publicClient: ReturnType<typeof createPublicClient>,
		private walletClient: ReturnType<typeof createWalletClient>,
		private rollup: any,
		private stakingAsset: any
	) {}

	static new = async () => {
		try {
			logger.info("Initializing Ethereum client");
			const rpcUrl = process.env.ETHEREUM_HOST as string;
			const privateKey = process.env.MINTER_PRIVATE_KEY as `0x${string}`;

			const publicClient = createPublicClient({
				chain: ethereumChain,
				transport: http(rpcUrl),
			});

			const walletClient = createWalletClient({
				account: privateKeyToAccount(privateKey),
				chain: ethereumChain,
				transport: http(rpcUrl),
			});

			const registry = getContract({
				address: process.env.ETHEREUM_REGISTRY_ADDRESS as `0x${string}`,
				abi: RegistryAbi,
				client: walletClient,
			});

			const rollupAddress = await registry.read.getCanonicalRollup();

			const rollup = getContract({
				address: rollupAddress as `0x${string}`,
				abi: RollupAbi,
				client: walletClient,
			});

			const stakingAsset = getContract({
				address: (await rollup.read.getStakingAsset()) as `0x${string}`,
				abi: TestERC20Abi,
				client: walletClient,
			});

			return new Ethereum(
				publicClient,
				walletClient,
				rollup,
				stakingAsset
			);
		} catch (error) {
			logger.error({ error }, "Error initializing Ethereum client");
			throw error;
		}
	};

	getPublicClient = () => {
		return this.publicClient;
	};

	getWalletClient = () => {
		return this.walletClient;
	};

	getRollup = () => {
		return this.rollup;
	};

	// TODO: For now, the withdrawer address is managed by the bot
	stakingAssetFaucet = async (address: string) => {
		const txHash = await this.stakingAsset.write.mint([
			this.walletClient.account?.address as `0x${string}`,
			process.env.DEPOSIT_AMOUNT as unknown as string,
		]);

		const receipt = await this.publicClient.waitForTransactionReceipt({
			hash: txHash,
		});

		return receipt;
	};

	addValidator = async (address: string): Promise<TransactionReceipt[]> => {
		const hashes = await Promise.all(
			[
				await this.stakingAsset.write.approve([
					this.rollup.address,
					process.env.APPROVAL_AMOUNT as unknown as string,
				]),
				await this.rollup.write.deposit([
					address,
					process.env.WITHDRAWER_ADDRESS as `0x${string}`,
					process.env.DEPOSIT_AMOUNT as unknown as string,
				]),
			].map((txHash) =>
				this.publicClient.waitForTransactionReceipt({
					hash: txHash,
				})
			)
		);

		return hashes;
	};

	removeValidator = async (address: string): Promise<TransactionReceipt> => {
		const withdrawerWalletClient = createWalletClient({
			account: privateKeyToAccount(
				process.env.WITHDRAWER_PRIVATE_KEY as `0x${string}`
			),
			chain: ethereumChain,
			transport: http(process.env.ETHEREUM_HOST as string),
		});

		const rollupWithdrawerScoped = getContract({
			address: this.rollup.address as `0x${string}`,
			abi: RollupAbi,
			client: withdrawerWalletClient,
		});

		const txHash = await rollupWithdrawerScoped.write.initiateWithdraw([
			address as `0x${string}`,
			process.env.WITHDRAWER_ADDRESS as `0x${string}`,
		]);

		const receipt = await this.publicClient.waitForTransactionReceipt({
			hash: txHash,
		});

		return receipt;
	};
}

export const ethereum = await Ethereum.new();

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
	WalletClient,
} from "viem";

import RollupAbi from "./rollupAbi.json" assert { type: "json" };
import TestERC20Abi from "./testERC20Abi.json" assert { type: "json" };

import { privateKeyToAccount } from "viem/accounts";

/**
 * Ethereum chain configuration
 * @const {Object} ethereumChain
 */
const ethereumChain = {
	id: 31337, // Hardhat's default chain ID
	name: "Local Hardhat",
	network: "hardhat",
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
		const rpcUrl = process.env.ETHEREUM_HOST as string;
		const privateKey = process.env.ETHEREUM_PRIVATE_KEY as `0x${string}`;
		const rollupAddress = process.env
			.ETHEREUM_ROLLUP_ADDRESS as `0x${string}`;

		const publicClient = createPublicClient({
			chain: ethereumChain,
			transport: http(rpcUrl),
		});

		const walletClient = createWalletClient({
			account: privateKeyToAccount(privateKey),
			chain: ethereumChain,
			transport: http(rpcUrl),
		});

		const rollup = getContract({
			address: rollupAddress,
			abi: RollupAbi.abi,
			client: walletClient,
		});

		const stakingAsset = getContract({
			address: (await rollup.read.STAKING_ASSET()) as `0x${string}`,
			abi: TestERC20Abi.abi,
			client: walletClient,
		});

		return new Ethereum(publicClient, walletClient, rollup, stakingAsset);
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

	addValidator = async (address: string): Promise<TransactionReceipt[]> => {
		const hashes = await Promise.all(
			[
				await this.stakingAsset.write.mint([
					this.walletClient.account?.address.toString(),
					process.env.MINIMUM_STAKE as unknown as string,
				]),
				await this.stakingAsset.write.approve([
					this.rollup.address,
					process.env.MINIMUM_STAKE as unknown as string,
				]),
				await this.rollup.write.deposit([
					address,
					address,
					privateKeyToAccount(
						process.env.ETHEREUM_PRIVATE_KEY as `0x${string}`
					).address,
					process.env.MINIMUM_STAKE as unknown as string,
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
		const txHash = await this.rollup.write.initiateWithdraw([
			address,
			address,
		]);

		return txHash;
	};
}

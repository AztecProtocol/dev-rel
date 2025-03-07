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
import RegistryAbi from "./registryAbi.json" assert { type: "json" };
import { privateKeyToAccount } from "viem/accounts";

/**
 * Ethereum chain configuration
 * @const {Object} ethereumChain
 */
const ethereumChain = {
	id: parseInt(process.env.ETHEREUM_CHAIN_ID as string),
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
			console.log("Initializing Ethereum client");
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
				abi: RegistryAbi.abi,
				client: walletClient,
			});

			console.log("Registry Address: ", registry.address);
			const rollupAddress = await registry.read.getRollup();

			const rollup = getContract({
				address: rollupAddress as `0x${string}`,
				abi: RollupAbi.abi,
				client: walletClient,
			});
			console.log("Rollup Address: ", rollup.address);

			const stakingAsset = getContract({
				address: (await rollup.read.getStakingAsset()) as `0x${string}`,
				abi: TestERC20Abi.abi,
				client: walletClient,
			});
			console.log("Staking Asset Address: ", stakingAsset.address);

			return new Ethereum(
				publicClient,
				walletClient,
				rollup,
				stakingAsset
			);
		} catch (error) {
			console.error("Error initializing Ethereum client:", error);
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

	addValidator = async (address: string): Promise<TransactionReceipt[]> => {
		const hashes = await Promise.all(
			[
				await this.stakingAsset.write.mint([
					this.walletClient.account?.address.toString(),
					process.env.MINIMUM_STAKE as unknown as string,
				]),
				await this.stakingAsset.write.approve([
					this.rollup.address,
					process.env.APPROVAL_AMOUNT as unknown as string,
				]),
				await this.rollup.write.deposit([
					address,
					address,
					privateKeyToAccount(
						process.env.MINTER_PRIVATE_KEY as `0x${string}`
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
			process.env.WITHDRAWER_ADDRESS as `0x${string}`,
		]);

		return txHash;
	};
}

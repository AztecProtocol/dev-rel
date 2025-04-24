/**
 * @fileoverview Ethereum client and utilities
 * @description Provides Ethereum client configuration and interaction methods
 * @module sparta/utils/ethereum
 */

import {
	createPublicClient,
	createWalletClient,
	encodeDeployData,
	getContract,
	getCreate2Address,
	http,
	padHex,
	toHex,
	TransactionReceipt,
	WalletClient,
} from "viem";

import { privateKeyToAccount } from "viem/accounts";
import type { Hex, Chain } from "viem"; // Import Chain type
import { RollupAbi, ForwarderAbi, StakingAssetHandlerAbi } from "./abis/index.ts"; // Explicitly import from index.ts
import { ForwarderBytecode } from "./bytecode/ForwarderBytecode.js"; // Import directly from forwarder.ts
import { logger } from "./logger.ts"; // Use relative path

export const DEPLOYER_ADDRESS: Hex =
	"0x4e59b44847b379578588920cA78FbF26c0B4956C";

/**
 * Ethereum chain configuration
 * @const {Object} ethereumChain
 */
const ethereumChain: Chain = {
	id: parseInt(process.env.L1_CHAIN_ID as string),
	name: "Sepolia",
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

export function getExpectedAddress(args: [`0x${string}`], salt: Hex) {
	const paddedSalt = padHex(salt, { size: 32 });
	const calldata = encodeDeployData({
		abi: ForwarderAbi,
		bytecode: ForwarderBytecode,
		args,
	});
	const address = getCreate2Address({
		from: DEPLOYER_ADDRESS,
		salt: paddedSalt,
		bytecode: calldata,
	});
	return {
		address,
		paddedSalt,
		calldata,
	};
}

export class Ethereum {
	constructor(
		private publicClient: ReturnType<typeof createPublicClient>,
		private rollup: any,
	) {}

	static new = async () => {
		try {
			logger.info("Initializing Ethereum client");
			const rpcUrl = process.env.ETHEREUM_HOST as string;
			
			const publicClient = createPublicClient({
				chain: ethereumChain,
				transport: http(rpcUrl),
			});


			const stakingAssetHandler = getContract({
				address: process.env
					.STAKING_ASSET_HANDLER_ADDRESS as `0x${string}`,
				abi: StakingAssetHandlerAbi,
				client: publicClient
			});

			const rollupAddress = await stakingAssetHandler.read.getRollup();

			const rollup = getContract({
				address: rollupAddress as `0x${string}`,
				abi: RollupAbi,
				client: publicClient,
			});

			return new Ethereum(
				publicClient,
				rollup
			);
		} catch (error) {
			logger.error({ error }, "Error initializing Ethereum client");
			throw error;
		}
	};

	getPublicClient = () => {
		return this.publicClient;
	};

	getRollup = () => {
		return this.rollup;
	};

}

export const ethereum = await Ethereum.new();

export { ethereumChain }; // Export chain config for validator-service 

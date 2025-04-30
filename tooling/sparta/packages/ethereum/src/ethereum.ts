/**
 * @fileoverview Ethereum client and utilities
 * @description Provides Ethereum client configuration and interaction methods
 * @module sparta/ethereum
 */

import {
	type Chain,
	type Hex,
	createPublicClient,
	getContract,
	http,
	encodeDeployData,
	getCreate2Address,
	padHex,
} from "viem";

import {
	RollupAbi,
	ForwarderAbi,
	StakingAssetHandlerAbi,
} from "./abis/index.js";
import { ForwarderBytecode } from "./bytecode/ForwarderBytecode.js";
import { logger } from "@sparta/utils";

// Chain information data type
export type ChainInfo = {
	pendingBlockNum: string;
	provenBlockNum: string;
	validators: string[];
	committee: string[];
	currentEpoch: string;
	currentSlot: string;
	proposerNow: string;
};

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
	constructor(private rollup: any) {}

	static new = async () => {
		try {
			logger.info("Initializing Ethereum client");
			const rpcUrl = process.env.ETHEREUM_HOST as string;

			if (!rpcUrl) {
				throw new Error(
					"ETHEREUM_HOST environment variable is not set or not loaded yet."
				);
			}

			const publicClient = createPublicClient({
				chain: ethereumChain,
				transport: http(rpcUrl),
			});

			const stakingAssetHandler = getContract({
				address: process.env
					.STAKING_ASSET_HANDLER_ADDRESS as `0x${string}`,
				abi: StakingAssetHandlerAbi,
				client: publicClient,
			});

			const rollupAddress = await stakingAssetHandler.read.getRollup();

			const rollup = getContract({
				address: rollupAddress as `0x${string}`,
				abi: RollupAbi,
				client: publicClient,
			});

			return new Ethereum(rollup);
		} catch (error) {
			logger.error({ error }, "Error initializing Ethereum client");
			throw error;
		}
	};

	getRollup = () => {
		return this.rollup;
	};

	/**
	 * Retrieves comprehensive information about the current blockchain state
	 *
	 * @returns {Promise<ChainInfo>} A promise that resolves to an object containing chain information
	 * @throws Will throw an error if retrieving chain information fails
	 */
	getRollupInfo = async (): Promise<ChainInfo> => {
		try {
			// Make API calls to fetch blockchain info
			const [
				pendingBlockNum,
				provenBlockNum,
				validators,
				committee,
				currentEpoch,
				currentSlot,
				proposerNow,
			] = await Promise.all([
				this.rollup.read.getPendingBlockNumber(),
				this.rollup.read.getProvenBlockNumber(),
				this.rollup.read.getAttesters(),
				this.rollup.read.getCurrentEpochCommittee(),
				this.rollup.read.getCurrentEpoch(),
				this.rollup.read.getCurrentSlot(),
				this.rollup.read.getCurrentProposer(),
			]);

			logger.info("Retrieved chain info from Ethereum rollup");

			return {
				pendingBlockNum: pendingBlockNum,
				provenBlockNum: provenBlockNum,
				validators: validators,
				committee: committee,
				currentEpoch: currentEpoch,
				currentSlot: currentSlot,
				proposerNow: proposerNow,
			};
		} catch (error) {
			logger.error({ error }, "Error getting rollup info");
			throw error;
		}
	};
}

// --- Lazy Initialization ---
let ethereumInstance: Ethereum | null = null;

/**
 * Gets the singleton instance of the Ethereum client, initializing it on first call.
 */
export async function getEthereumInstance(): Promise<Ethereum> {
	if (!ethereumInstance) {
		logger.info(
			"First call to getEthereumInstance, initializing Ethereum singleton..."
		);
		try {
			ethereumInstance = await Ethereum.new();
			logger.info("Ethereum singleton initialized successfully.");
		} catch (error) {
			logger.error(
				{ error },
				"Failed to initialize Ethereum singleton in getEthereumInstance"
			);
			// Re-throw the error to propagate it to the caller
			throw error;
		}
	}
	return ethereumInstance;
}

export { ethereumChain }; // Export chain config for validator-service

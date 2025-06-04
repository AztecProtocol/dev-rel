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
	createWalletClient,
	type WalletClient,
	type PublicClient,
} from "viem";

import {
	RollupAbi,
	ForwarderAbi,
	StakingAssetHandlerAbi,
} from "./abis/index.js";
import { ForwarderBytecode } from "./bytecode/ForwarderBytecode.js";
import { privateKeyToAccount } from "viem/accounts";
import { logger } from "@sparta/utils";
import { EpochSyncService } from "./epoch-sync-service.js";

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
	private epochSyncService: EpochSyncService;

	constructor(private rollup: any, private stakingAssetHandler: any, private publicClient: PublicClient, private walletClient: WalletClient) {
		// Initialize the epoch sync service
		this.epochSyncService = new EpochSyncService(this);
		
		// Start monitoring epoch changes automatically (unless disabled)
		const enableEpochSync = process.env.ENABLE_EPOCH_SYNC !== "false"; // Defaults to enabled
		if (enableEpochSync) {
			this.epochSyncService.start();
			logger.info("Ethereum instance initialized with epoch sync service");
		} else {
			logger.info("Ethereum instance initialized with epoch sync service disabled");
		}
	}

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


			const privateKey = process.env.SPARTA_PRIVATE_KEY as `0x${string}`;

			const walletClient = createWalletClient({
				account: privateKeyToAccount(privateKey),
				chain: ethereumChain,
				transport: http(rpcUrl),
			});


			const stakingAssetHandler = getContract({
				address: process.env
					.STAKING_ASSET_HANDLER_ADDRESS as `0x${string}`,
				abi: StakingAssetHandlerAbi,
				client: walletClient,
			});

			const rollupAddress = await stakingAssetHandler.read.getRollup();

			const rollup = getContract({
				address: rollupAddress as `0x${string}`,
				abi: RollupAbi,
				client: publicClient,
			});

			return new Ethereum(rollup, stakingAssetHandler, publicClient, walletClient);
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new Error(error.message);
			} else {
				throw new Error(String(error));
			}
		}
	};

	/**
	 * Stops the epoch sync service
	 */
	stopEpochSync = () => {
		this.epochSyncService.stop();
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
		} catch (error: unknown) {
			logger.error({ error }, "Error getting rollup info");
			if (error instanceof Error) {
				throw new Error(error.message);
			} else {
				throw new Error(String(error));
			}
		}
	};

	/**
	 * Adds a validator to the rollup system
	 * 
	 * @param {string} validatorAddress - Ethereum address of the validator to add
	 * @returns {Promise<boolean>} True if the validator was added successfully
	 * @throws Will throw an error if adding the validator fails
	 */
	addValidator = async (validatorAddress: string): Promise<boolean> => {
		try {
			logger.info({ validatorAddress }, "Adding validator to rollup");

			const forwarderAddress = getExpectedAddress(
				[validatorAddress.toString() as `0x${string}`],
				validatorAddress.toString() as `0x${string}`)

			logger.info(`Attester address: ${validatorAddress} Forwarder address: ${forwarderAddress.address}`);

			const tx = await this.stakingAssetHandler.write.addValidator([validatorAddress as `0x${string}`, forwarderAddress.address as `0x${string}`]);
			const receipt = await this.publicClient.waitForTransactionReceipt({ hash: tx });

			if (receipt.status === "success") {
				logger.info({ validatorAddress }, "Successfully added validator to rollup");
				return true;
			} else {
				logger.error({ validatorAddress }, "Failed to add validator to rollup");
				return false;
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new Error(error.message);
			} else {
				throw new Error(String(error));
			}
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
		} catch (error: unknown) {
			logger.error(
				{ error },
				"Failed to initialize Ethereum singleton in getEthereumInstance"
			);
			// Re-throw the error to propagate it to the caller
			if (error instanceof Error) {
				throw new Error(error.message);
			} else {
				throw new Error(String(error));
			}
		}
	}
	return ethereumInstance;
}

export { ethereumChain }; // Export chain config for validator-service

import {
	AbiConstructorNotFoundError,
	createPublicClient,
	createWalletClient,
	getContract,
	http,
	PublicClient,
} from "viem";

import RollupAbi from "./rollupAbi.json";

import {
	generatePrivateKey,
	mnemonicToAccount,
	privateKeyToAccount,
} from "viem/accounts";

export class Ethereum {
	public publicClient: PublicClient;

	constructor() {
		this.publicClient = createPublicClient({
			chain: {
				id: process.env.ETHEREUM_CHAIN_ID as unknown as number,
				name: "Ethereum",
				rpcUrls: {
					default: {
						http: [process.env.ETHEREUM_HOST as unknown as string],
					},
				},
				nativeCurrency: {
					decimals: 18,
					name: "Ether",
					symbol: "ETH",
				},
			},
			transport: http(process.env.ETHEREUM_HOST as unknown as string),
		});
	}

	getPublicClient = () => {
		return this.publicClient;
	};

	getRollupContract = () => {
		const rollup = getContract({
			address: process.env
				.ETHEREUM_ROLLUP_ADDRESS as unknown as `0x${string}`,
			abi: RollupAbi.abi,
			client: this.publicClient,
		});
		return rollup;
	};
}

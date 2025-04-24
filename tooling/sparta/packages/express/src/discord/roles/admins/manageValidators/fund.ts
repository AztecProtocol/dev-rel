import { ChatInputCommandInteraction } from "discord.js";
import { validateAddress } from "@sparta/utils";
import { createWalletClient, http, parseEther, Hex } from "viem"; // Import viem utils
import { privateKeyToAccount } from "viem/accounts"; // Import account utils
import { ethereumChain } from "@sparta/utils/ethereum"; // Import chain config
import { logger } from "@sparta/utils"; // Import logger

export const fund = async (interaction: ChatInputCommandInteraction) => {
	const address = validateAddress(interaction);
	if (typeof address !== "string") {
		await interaction.editReply({ content: `Invalid address provided.` });
		return `Invalid address`;
	}

	try {
		logger.info({ address }, "Attempting to fund address via admin command");
		// Get funder configuration from environment variables
		const funderPrivateKey = process.env.FUNDER_ADDRESS_PRIVATE_KEY as Hex | undefined;
		const funderAmount = process.env.FUNDER_AMOUNT; // e.g., "0.1"
		const rpcUrl = process.env.ETHEREUM_HOST as string | undefined;
		// Chain ID is derived from imported ethereumChain

		if (!funderPrivateKey || !funderAmount || !rpcUrl) {
			logger.error("Missing required environment variables for funding: FUNDER_ADDRESS_PRIVATE_KEY, FUNDER_AMOUNT, ETHEREUM_HOST");
			await interaction.editReply({ content: "Funding configuration error on server." });
			return "Funding configuration error";
		}

		// Create a dedicated WalletClient for the funder
		const funderAccount = privateKeyToAccount(funderPrivateKey);
		const funderClient = createWalletClient({
			account: funderAccount,
			chain: ethereumChain, 
			transport: http(rpcUrl)
		});

		logger.debug(
			{ address, amount: funderAmount, funder: funderAccount.address },
			"Funding validator via Viem sendTransaction"
		);

		// Send the transaction
		const txHash = await funderClient.sendTransaction({
			chain: funderClient.chain,
			to: address as Hex, // Cast address to Hex
			value: parseEther(funderAmount) // Convert ETH amount string to wei BigInt
		});

		logger.info({ txHash, address, amount: funderAmount }, "Funding transaction sent");

		await interaction.editReply({
			content: `Successfully sent ${funderAmount} ETH to ${address}. Tx: ${txHash}`,
		});
		return "Funded validator";

	} catch (error: any) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error({ error: errorMessage, address }, "Error funding validator via admin command");
		await interaction.editReply({ content: `Failed to fund validator. Error: ${errorMessage}` });
		return "Error funding validator";
	}
};

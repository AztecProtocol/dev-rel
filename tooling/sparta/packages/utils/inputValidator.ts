import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

/**
 * Checks if a string is a valid Ethereum address.
 * Browser-safe.
 */
export const isValidEthereumAddress = (address: string | null | undefined): boolean => {
	if (!address) return false;
	return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validates an Ethereum address from a Discord command interaction.
 * Uses interaction context and replies ephemerally on failure.
 * NOT browser-safe.
 */
export const validateAddressFromInteraction = (interaction: ChatInputCommandInteraction): string | null => {
	const address = interaction.options.getString("address");

	if (!address) {
		interaction.reply({
			content: "Please provide an address.",
			flags: MessageFlags.Ephemeral,
		});
		return null; // Indicate failure
	}

	if (!isValidEthereumAddress(address)) { // Use the generic validator
		interaction.reply({
			content: "Please provide a valid Ethereum address.",
			flags: MessageFlags.Ephemeral,
		});
		return null; // Indicate failure
	}

	return address; // Return the valid address
};

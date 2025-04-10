import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

export const validateAddress = (interaction: ChatInputCommandInteraction) => {
	const address = interaction.options.getString("address");
	if (!address) {
		return interaction.reply({
			content: "Please provide an address.",
			flags: MessageFlags.Ephemeral,
		});
	}
	if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
		return interaction.reply({
			content: "Please provide a valid Ethereum address.",
			flags: MessageFlags.Ephemeral,
		});
	}
	return address;
};

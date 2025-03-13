import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
} from "discord.js";
import { ChainInfoService } from "../services/chaininfo-service.js";

export default {
	data: new SlashCommandBuilder()
		.setName("validator")
		.setDescription("Manage validator addresses")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("check")
				.setDescription("Check if you are a validator")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator address to check")
				)
		),

	execute: async (
		interaction: ChatInputCommandInteraction
	): Promise<string> => {
		try {
			const address = interaction.options.getString("address");
			if (!address) {
				await interaction.reply({
					content: "Address is required.",
					flags: MessageFlags.Ephemeral,
				});
				return `Address not provided`;
			}

			// Basic address validation
			if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
				await interaction.reply({
					content: "Please provide a valid Ethereum address.",
					flags: MessageFlags.Ephemeral,
				});
				return `Invalid address`;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			if (interaction.options.getSubcommand() === "check") {
				const info = await ChainInfoService.getInfo();
				const { validators, committee } = info;

				let reply = "";
				if (validators.includes(address)) {
					reply += "You are a validator\n";
				}
				if (committee.includes(address)) {
					reply += "You are a committee member\n";
				}

				await interaction.editReply({
					content:
						reply || "You are not a validator or committee member",
				});
				return `Checked validator ${address}`;
			}
			return `Unknown subcommand`;
		} catch (error) {
			await interaction.editReply({
				content: `Failed to check validator address`,
			});
			return `Failed with error: ${
				error instanceof Error && error.message
			}`;
		}
	},
};

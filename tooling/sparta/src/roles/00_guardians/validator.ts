import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
} from "discord.js";
import { validateAddress } from "../../utils/inputValidator.js";
import { ValidatorService } from "../../services/validator-service.js";
import { ChainInfoService } from "../../services/chaininfo-service.js";
import { getExpectedAddress } from "../../clients/ethereum.js";

export default {
	data: new SlashCommandBuilder()
		.setName("validator")
		.setDescription("Validator commands for Guardian users")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("add")
				.setDescription("Add a validator")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The address to receive the assets")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("check-validator")
				.setDescription("Check if you are a validator")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator address to check")
						.setRequired(true)
				)
		),
	execute: async (
		interaction: ChatInputCommandInteraction
	): Promise<string> => {
		try {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const address = validateAddress(interaction);
			if (typeof address !== "string") {
				await interaction.editReply({
					content: "Please provide a valid address",
				});
				return `Invalid address`;
			}
			if (interaction.options.getSubcommand() === "check") {
				const forwarder = getExpectedAddress(
					[address as `0x${string}`],
					address as `0x${string}`
				).address;

				const info = await ChainInfoService.getInfo();
				const { validators, committee } = info;

				let reply = "Your forwarder contract is: " + forwarder + "\n";
				reply += `It is ${
					!validators.includes(address) && "not"
				} a validator\n`;

				reply += `It is ${
					!committee.includes(address) && "not"
				} a committee member\n`;

				await interaction.editReply({
					content: reply,
				});
				return `Checked validator ${address} with forwarder ${forwarder}`;
			} else {
				await interaction.editReply({
					content: `Unknown subcommand: ${interaction.options.getSubcommand()}`,
				});
				return `Unknown subcommand`;
			}
		} catch (error) {
			await interaction.editReply({
				content: `Failed with error: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			});
			return `Failed with error: ${
				error instanceof Error ? error.message : "Unknown error"
			}`;
		}
	},
};

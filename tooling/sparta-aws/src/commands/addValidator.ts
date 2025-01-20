import { SlashCommandBuilder } from "@discordjs/builders";
import { PermissionFlagsBits } from "discord.js";
import { ValidatorService } from "../services/validator-service.js";
import type { CommandModule, DiscordInteraction } from "../types/discord.js";
import {
	ApplicationCommandOptionType,
	createMockResponse,
} from "../types/discord.js";

export const addValidator: CommandModule = {
	data: new SlashCommandBuilder()
		.setName("add-validator")
		.setDescription("Add a validator")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addStringOption((option) =>
			option
				.setName("address")
				.setDescription("The validator to add")
				.setRequired(true)
		),

	async execute(interaction: DiscordInteraction) {
		try {
			const address = interaction.data.options?.find(
				(opt) =>
					opt.name === "address" &&
					opt.type === ApplicationCommandOptionType.STRING
			)?.value;

			if (!address) {
				return createMockResponse("Please provide an address to add");
			}

			await ValidatorService.addValidator(address);
			return createMockResponse(`Added validator ${address}`);
		} catch (error) {
			console.error("Error in add-validator command:", error);
			return createMockResponse(
				`Failed to add validator: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	},
};

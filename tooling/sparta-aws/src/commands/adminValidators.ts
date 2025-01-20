import { SlashCommandBuilder } from "@discordjs/builders";
import { PermissionFlagsBits } from "discord.js";
import { ChainInfoService } from "../services/chaininfo-service.js";
import { ValidatorService } from "../services/validator-service.js";
import type { CommandModule, DiscordInteraction } from "../types/discord.js";
import {
	ApplicationCommandOptionType,
	createMockResponse,
} from "../types/discord.js";

// List of excluded validator addresses
export const EXCLUDED_VALIDATORS = [
	"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
	// ... add the rest of the excluded validators here
];

export const adminValidators: CommandModule = {
	data: new SlashCommandBuilder()
		.setName("admin")
		.setDescription("Admin commands")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommandGroup((group) =>
			group
				.setName("validators")
				.setDescription("Manage validators")
				.addSubcommand((subcommand) =>
					subcommand.setName("get").setDescription("Get validators")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("remove")
						.setDescription("Remove a validator")
						.addStringOption((option) =>
							option
								.setName("address")
								.setDescription("The validator to remove")
								.setRequired(true)
						)
				)
		)
		.addSubcommandGroup((group) =>
			group
				.setName("committee")
				.setDescription("Manage the committee")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("get")
						.setDescription("Get the current committee")
				)
		),

	async execute(interaction: DiscordInteraction) {
		try {
			// Get subcommand group and subcommand from the nested options
			const subcommandGroup = interaction.data.options?.find(
				(opt) =>
					opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP
			);
			const subcommand = subcommandGroup?.options?.find(
				(opt) => opt.type === ApplicationCommandOptionType.SUB_COMMAND
			);
			const subcommandOptions = subcommand?.options || [];

			console.log("Executing admin command:", {
				subcommandGroup: subcommandGroup?.name,
				subcommand: subcommand?.name,
				options: subcommandOptions,
			});

			const { validators, committee } = await ChainInfoService.getInfo();

			// Ensure validators and committee are arrays
			const validatorList = Array.isArray(validators) ? validators : [];
			const committeeList = Array.isArray(committee) ? committee : [];

			const filteredValidators = validatorList.filter(
				(v) => !EXCLUDED_VALIDATORS.includes(v)
			);
			const filteredCommittee = committeeList.filter(
				(v) => !EXCLUDED_VALIDATORS.includes(v)
			);

			if (!subcommandGroup?.name || !subcommand?.name) {
				return createMockResponse("Invalid command structure");
			}

			if (
				subcommandGroup.name === "committee" &&
				subcommand.name === "get"
			) {
				return createMockResponse(
					`Committee total: ${
						committeeList.length
					}.\nCommittee (excl. Aztec Labs):\n${filteredCommittee.join(
						"\n"
					)}`
				);
			} else if (subcommandGroup.name === "validators") {
				if (subcommand.name === "get") {
					return createMockResponse(
						`Validators total: ${
							validatorList.length
						}.\nValidators (excl. Aztec Labs):\n${filteredValidators.join(
							"\n"
						)}`
					);
				} else if (subcommand.name === "remove") {
					const address = subcommandOptions.find(
						(opt) =>
							opt.name === "address" &&
							opt.type === ApplicationCommandOptionType.STRING
					)?.value;
					if (!address) {
						return createMockResponse(
							"Please provide an address to remove"
						);
					}
					await ValidatorService.removeValidator(address);
					return createMockResponse(`Removed validator ${address}`);
				}
			}

			return createMockResponse(
				`Invalid command: ${subcommandGroup.name} ${subcommand.name}`
			);
		} catch (error) {
			console.error("Error in admin command:", error);
			return createMockResponse(
				`Failed to execute admin command: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	},
};

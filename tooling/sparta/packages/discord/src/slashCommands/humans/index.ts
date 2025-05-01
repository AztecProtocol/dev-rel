/**
 * @fileoverview Passport verification command handler
 * @description Handles Discord commands for Human Passport verification
 * @module sparta/discord/roles/humans
 */

import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
} from "discord.js";
import { logger } from "@sparta/utils";
import verifyCommandModule, { verifySubcommand } from "./verify.js";
import statusCommandModule, { statusSubcommand } from "./status.js";
import { HumanSubcommandGroups, HumanSubcommands } from "../../types.js";

/**
 * Command data for passport verification commands
 */
const passportCommandData = new SlashCommandBuilder()
	.setName(HumanSubcommandGroups.Human)
	.setDescription("Human Passport verification commands")
	.addSubcommand((subcommand) => {
		subcommand
			.setName(HumanSubcommands.Verify)
			.setDescription("Verify your identity with Human Passport");
		return subcommand;
	})
	.addSubcommand((subcommand) => {
		subcommand
			.setName(HumanSubcommands.Status)
			.setDescription("Check your Human Passport verification status");
		return subcommand;
	});

/**
 * Main command execution logic
 * Routes to the appropriate subcommand handler
 */
async function execute(
	interaction: ChatInputCommandInteraction
): Promise<string | undefined> {
	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const subcommand = interaction.options.getSubcommand();

		switch (subcommand) {
			case HumanSubcommands.Verify:
				await verifyCommandModule.execute(interaction);
				return "Verification link sent";

			case HumanSubcommands.Status:
				await statusCommandModule.execute(interaction);
				return "Status information sent";

			default:
				await interaction.reply({
					content: "Unknown command",
					flags: MessageFlags.Ephemeral,
				});
				return "Unknown command";
		}
	} catch (error: any) {
		logger.error(error, "Error executing human passport command");

		if (!interaction.replied && !interaction.deferred) {
			await interaction.editReply({
				content: "An error occurred while processing your command.",
			});
		}

		return "Error executing command";
	}
}

// Export the command definition
export default {
	data: passportCommandData,
	execute,
};

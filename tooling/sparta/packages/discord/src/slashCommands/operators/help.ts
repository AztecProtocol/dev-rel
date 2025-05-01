/**
 * @fileoverview Operator help command handler
 * @description Handles Discord command for displaying node operator command documentation and registration instructions
 * @module sparta/discord/roles/operators/help
 */

import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
} from "discord.js";
import { logger } from "@sparta/utils";
import { NodeOperatorSubcommands } from "../../types.js";

/**
 * Display help information for all operator commands with reference to registration
 */
export async function showOperatorHelp(
	interaction: ChatInputCommandInteraction
): Promise<string> {
	try {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral,
		});

		// Create a formatted embed for the command help
		const helpEmbed = new EmbedBuilder()
			.setTitle("🔧 Node Operator Commands")
			.setDescription(
				"Available commands and tools for Sparta Network node operators"
			)
			.setColor(0x4bb543) // Green color for operator commands
			.addFields([
				{
					name: `/operator ${NodeOperatorSubcommands.Help}`,
					value: "Display this help message with available commands",
					inline: false,
				},
				{
					name: `/operator ${NodeOperatorSubcommands.ChainInfo}`,
					value: "Get current information about the Sparta Network chain status",
					inline: false,
				},
				{
					name: `/operator ${NodeOperatorSubcommands.MyStats}`,
					value: "Check your validator statistics and performance\n`address` - Your validator address (required)",
					inline: false,
				},
				{
					name: `/operator ${NodeOperatorSubcommands.Start}`,
					value: "Register your validator node on the discord server\n• Run without parameters for detailed registration instructions\n• Or use with:\n`address` - Your validator address\n`block-number` - Block number for verification\n`proof` - Your sync proof",
					inline: false,
				},
			])
			.setFooter({
				text: "Use these commands to manage your node operations",
			})
			.setTimestamp();

		await interaction.editReply({
			embeds: [helpEmbed],
		});

		return "Operator help information displayed successfully";
	} catch (error) {
		logger.error("Error displaying operator help:", error);
		await interaction.editReply({
			content: "Error displaying operator help information.",
		});
		throw error;
	}
}

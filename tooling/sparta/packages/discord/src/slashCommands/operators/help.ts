/**
 * @fileoverview Operator help command handler
 * @description Handles Discord command for displaying node operator command documentation
 * @module sparta/discord/roles/operators/help
 */

import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";
import { logger } from "@sparta/utils";
import { AztecSubcommands, NodeOperatorSubcommands } from "../../types.js";
import { manageChannelMessage } from "../../utils/messageManager.js";

/**
 * Display help information for all operator commands with interactive buttons
 */
export async function showOperatorHelp(
	interaction: ChatInputCommandInteraction
): Promise<string> {
	try {
		// Make this NOT ephemeral as requested
		await interaction.deferReply();

		// Create a formatted embed for the command help
		const helpEmbed = new EmbedBuilder()
			.setTitle("⚔️ SPARTAN WARRIOR COMMAND CENTER ⚔️")
			.setDescription(
				"**Greetings, warrior!** I am your Spartan guide in the Aztec Network. These battle-tested commands will help you defend our digital realm and keep your node fighting strong. Use the arsenal below to master your duties!"
			)
			.setColor(0x8B0000) // Deep red for Spartan theme
			.addFields([
				{
					name: `📊 /operator ${NodeOperatorSubcommands.MyStats}`,
					value: "🛡️ **Scout your battle status and validator strength**\n• Review your warrior registration\n• Monitor your validator's performance in battle\n• Track how well you're defending the network",
					inline: false,
				},
				{
					name: `⛓️ /aztec ${AztecSubcommands.Info}`,
					value: "🏛️ **Survey the battlefield - Aztec Network status**\n• Latest block intelligence reports\n• Network fortress statistics\n• Chain health and battle readiness",
					inline: false,
				},
				{
					name: `🗡️ /operator ${NodeOperatorSubcommands.AddValidator}`,
					value: "🗡️ **Deploy additional validator to the front lines**\n• Add a new validator to your operator account\n• Expand your defensive capabilities\n• Requires a valid Ethereum validator address",
					inline: false,
				},
				{
					name: `🏰 /operator ${NodeOperatorSubcommands.IsReady}`,
					value: "🔍 **Test your fortress battle readiness**\n• Check if your node ports are accessible to allies\n• Verify network connectivity for optimal performance\n• Avoid being escorted out of the ranks (slashing risk)\n• Requires your public IP address for remote checking",
					inline: false,
				}
			])
			.addFields([
				{
					name: "🎯 Warrior's Path",
					value: "**Active in our Spartan army?**\n1. Use **Battlefield Survey** to check our defenses\n2. Monitor your **Battle Performance** regularly\n3. Deploy additional **Validators** as needed\n4. Keep your fortress **Battle Ready** at all times",
					inline: false,
				},
				{
					name: "🏺 Ancient Wisdom",
					value: "• Ensure your node is battle-ready and fully synced\n• Keep your validator address sharp and ready\n• Join our war council channels for support\n• Check battlefield status (chain info) often, like a true Spartan",
					inline: false,
				},
			])
			.setFooter({
				text: "Aztec Network • Spartan Defense Force",
			})
			.setTimestamp();

		// Create action buttons for quick access to commands
		const buttonRow = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('operator_my_stats')
					.setLabel('📊 My Stats')
					.setStyle(ButtonStyle.Primary)
					.setEmoji('🛡️'),
				new ButtonBuilder()
					.setCustomId('operator_chain_info')
					.setLabel('⛓️ Chain Information')
					.setStyle(ButtonStyle.Secondary)
					.setEmoji('🏛️'),
				new ButtonBuilder()
					.setCustomId('operator_is_ready')
					.setLabel('🏰 IP Check')
					.setStyle(ButtonStyle.Secondary)
					.setEmoji('🔍'),
				new ButtonBuilder()
					.setCustomId('operator_add_validator')
					.setLabel('🗡️ Add Validator')
					.setStyle(ButtonStyle.Success)
					.setEmoji('🗡️'),
			);

		const helpMessage = await interaction.editReply({
			embeds: [helpEmbed],
			components: [buttonRow],
		});

		// Use the message manager utility to handle cleanup
		await manageChannelMessage(interaction, 'help', helpMessage);

		return "Spartan warrior guidance displayed successfully";
	} catch (error) {
		logger.error("Error displaying operator help:", error);
		await interaction.editReply({
			content: "⚔️ Battle error! The command scroll has been damaged, warrior.",
		});
		throw error;
	}
}

/**
 * @fileoverview Operator help command handler
 * @description Handles Discord command for displaying node operator command documentation and registration instructions
 * @module sparta/discord/roles/operators/help
 */

import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
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
					name: `🚀 /operator ${NodeOperatorSubcommands.Start}`,
					value: "⚔️ **Join the Spartan ranks - Register as a warrior**\n• Complete your oath of service\n• Submit your battle address\n• Prove your node is ready for combat",
					inline: false,
				},
				{
					name: `📝 /operator ${NodeOperatorSubcommands.StartHelp}`,
					value: "📜 **Battle instructions for new recruits**\n• Learn the ancient art of sync proof generation\n• Master the registration ritual\n• Troubleshooting for fallen warriors",
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
					value: "**New to our Spartan army?**\n1. Study the **Registration Scroll** for detailed battle plans\n2. Use **Battlefield Survey** to check our defenses\n3. Complete your **Warrior Oath** with the register command\n4. Monitor your **Battle Performance** regularly",
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
					.setCustomId('operator_registration_guide')
					.setLabel('📝 Registration Guide')
					.setStyle(ButtonStyle.Success)
					.setEmoji('📜'),
			);

		const buttonRow2 = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('operator_start_registration')
					.setLabel('🚀 Register for battle')
					.setStyle(ButtonStyle.Success)
					.setEmoji('⚔️')
			);

		const helpMessage = await interaction.editReply({
			embeds: [helpEmbed],
			components: [buttonRow, buttonRow2],
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

/**
 * Display detailed instructions for validator registration
 */
export async function showRegistrationHelp(
	interaction: ChatInputCommandInteraction
): Promise<string> {
	try {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral,
		});

		// Create a registration instructions embed
		const registrationEmbed = new EmbedBuilder()
			.setTitle("📜 SPARTAN REGISTRATION GUIDE")
			.setDescription(
				"**Welcome, warrior!** Follow these steps to generate your sync proof and register your validator node with the Aztec Network."
			)
			.setColor(0x8B0000) // Deep red for Spartan theme
			.addFields([
				{
					name: "📋 Step 1: Get the latest proven block number",
					value: '```bash\ncurl -s -X POST -H \'Content-Type: application/json\' \\\n-d \'{"jsonrpc":"2.0","method":"node_getL2Tips","params":[],"id":67}\' \\\n<your-node-url> | jq -r ".result.proven.number"\n```\n• Replace `<your-node-url>` with your node\'s URL (e.g., `http://localhost:8080` or `https://mynode.example.com:8080`)\n• Save this block number for the next steps\n• Example output: `12345`',
					inline: false,
				},
				{
					name: "🔍 Step 2: Generate your sync proof",
					value: '```bash\ncurl -s -X POST -H \'Content-Type: application/json\' \\\n-d \'{"jsonrpc":"2.0","method":"node_getArchiveSiblingPath","params":["<block-number>","<block-number>"],"id":67}\' \\\n<your-node-url> | jq -r ".result"\n```\n• Use the same node URL from Step 1\n• Replace both `<block-number>` instances with the number from Step 1 (example: 12345)\n• This will output a long base64-encoded string - copy it completely\n• Example command with actual values:\n```bash\ncurl -s -X POST -H \'Content-Type: application/json\' \\\n-d \'{"jsonrpc":"2.0","method":"node_getArchiveSiblingPath","params":["12345","12345"],"id":67}\' \\\nhttp://localhost:8080 | jq -r ".result"\n```',
					inline: false,
				},
				{
					name: "✅ Step 3: Register with Discord",
					value: "Type this command in Discord:\n```\n/operator start\n```\n**IMPORTANT**: Discord will show option fields for your registration:\n```\nREGISTRATION FIELDS\naddress            Your validator's Ethereum address\nblock-number      Block number for verification\nproof             Your sync proof\n```\nFill in each field:\n• `address`: Your Ethereum validator address (must start with 0x, example: 0x1234567890abcdef1234567890abcdef12345678)\n• `block-number`: The block number from Step 1 (example: 12345)\n• `proof`: The complete base64 string from Step 2\n\n⚠️ **Important**: Click each option field separately to input your data - don't try to type everything in one line.",
					inline: false,
				},
				{
					name: "💡 Tips for Success",
					value: "• Ensure your node is fully synced before attempting registration\n• Double-check your validator Ethereum address format (must begin with 0x followed by 40 hex characters)\n• Copy the entire proof string without missing any characters\n• If you don't have `jq` installed, omit the `| jq -r \".result\"` part and extract the result manually\n• If registration fails, try generating a new proof with a more recent block\n• Common errors: incorrect node URL, node not synced, or incomplete proof string",
					inline: false,
				},
				{
					name: "🛠️ Troubleshooting",
					value: "• If you get `Connection refused`: Check that your node is running and the URL is correct\n• If your proof is invalid: Ensure your node is fully synced and try again with a newer block\n• If you can't format the commands properly: Ask for help in the support channel\n• Remember: Even experienced users face challenges - don't hesitate to ask for help!",
					inline: false,
				},
			]);

		await interaction.editReply({
			embeds: [registrationEmbed],
		});

		return "Spartan registration instructions displayed successfully";
	} catch (error) {
		logger.error("Error displaying registration help:", error);
		await interaction.editReply({
			content: "⚔️ The registration guide is temporarily unavailable. Please try again or ask for help in the support channel.",
		});
		throw error;
	}
}

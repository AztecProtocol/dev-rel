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

// /**
//  * Display help information for all operator commands with reference to registration
//  */
// export async function showOperatorHelp(
// 	interaction: ChatInputCommandInteraction
// ): Promise<string> {
// 	try {
// 		await interaction.deferReply({
// 			flags: MessageFlags.Ephemeral,
// 		});

// 		// Create a formatted embed for the command help
// 		const helpEmbed = new EmbedBuilder()
// 			.setTitle("🔧 Node Operator Commands")
// 			.setDescription(
// 				"Available commands and tools for Sparta Network node operators"
// 			)
// 			.setColor(0x4bb543) // Green color for operator commands
// 			.addFields([
// 				{
// 					name: `/operator ${NodeOperatorSubcommands.Help}`,
// 					value: "Display this help message with available commands",
// 					inline: false,
// 				},
// 				{
// 					name: `/operator ${NodeOperatorSubcommands.ChainInfo}`,
// 					value: "Get current information about the Sparta Network chain status",
// 					inline: false,
// 				},
// 				{
// 					name: `/operator ${NodeOperatorSubcommands.MyStats}`,
// 					value: "Check your validator statistics and performance\n`address` - Your validator address (required)",
// 					inline: false,
// 				},
// 				{
// 					name: `/operator ${NodeOperatorSubcommands.Register}`,
// 					value: "Register your validator node on the discord server\n• Run without parameters for detailed registration instructions\n• Or use with:\n`address` - Your validator address\n`block-number` - Block number for verification\n`proof` - Your sync proof",
// 					inline: false,
// 				},
// 			])
// 			.setFooter({
// 				text: "Use these commands to manage your node operations",
// 			})
// 			.setTimestamp();

// 		await interaction.editReply({
// 			embeds: [helpEmbed],
// 		});

// 		return "Operator help information displayed successfully";
// 	} catch (error) {
// 		logger.error("Error displaying operator help:", error);
// 		await interaction.editReply({
// 			content: "Error displaying operator help information.",
// 		});
// 		throw error;
// 	}
// }

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
			.setTitle("📝 How to Get the Apprentice Role")
			.setDescription(
				"Follow these simple steps to generate a sync proof and register your validator node on the Discord server"
			)
			.setColor(0x4bb543) // Green color
			.addFields([
				{
					name: "📋 Step 1: Get the latest proven block number",
					value: '```bash\ncurl -s -X POST -H \'Content-Type: application/json\' \\\n-d \'{"jsonrpc":"2.0","method":"node_getL2Tips","params":[],"id":67}\' \\\n<your-node>:<your-port> | jq -r ".result.proven.number"\n```\n• Replace `<your-node>:<your-port>` with your node\'s URL, for example `http://localhost:8080` or `https://mynode.example.com:8080`\n• Save this block number for the next steps\n• Example output: `12345`',
					inline: false,
				},
				{
					name: "🔍 Step 2: Generate your sync proof",
					value: '```bash\ncurl -s -X POST -H \'Content-Type: application/json\' \\\n-d \'{"jsonrpc":"2.0","method":"node_getArchiveSiblingPath","params":["<block-number>","<block-number>"],"id":67}\' \\\n<your-node>:<your-port> | jq -r ".result"\n```\n• Replace `<your-node>:<your-port>` with the same URL you used in Step 1\n• Replace both instances of `<block-number>` with the number from Step 1 (example: 12345)\n• This will output a long base64-encoded string - copy it completely\n• Example command with values filled in:\n```bash\ncurl -s -X POST -H \'Content-Type: application/json\' \\\n-d \'{"jsonrpc":"2.0","method":"node_getArchiveSiblingPath","params":["12345","12345"],"id":67}\' \\\nhttp://localhost:8080 | jq -r ".result"\n```',
					inline: false,
				},
				{
					name: "✅ Step 3: Register with Discord",
					value: "Type the following command in this Discord server:\n```\n/operator start\n```\n**IMPORTANT**: After typing the command, Discord will display option fields that look like this:\n```\nOPTIONS\naddress            Your validator address\nblock-number      Block number for verification\nproof             Your sync proof\n```\nClick on each option to fill in your information:\n• `address`: Your Ethereum validator address (must start with 0x, example: 0x1234567890abcdef1234567890abcdef12345678)\n• `block-number`: The block number from Step 1 (example: 12345)\n• `proof`: The complete base64 string from Step 2\n\n❗ **Common mistake**: Do not type all parameters in a single line. You must click on each option field separately to input your data.",
					inline: false,
				},
				{
					name: "💡 Tips for Success",
					value: "• Ensure your node is fully synced before attempting registration\n• Double-check your validator Ethereum address format (must begin with 0x followed by 40 hex characters)\n• Make sure to copy the entire proof string without missing any characters\n• If you don't have jq installed, you can omit the `| jq` part and extract the needed values manually\n• If registration fails, try generating a new proof with a more recent block\n• Common errors: incorrect URL format, node not synced, or incomplete proof string",
					inline: false,
				},
				{
					name: "🛠️ Troubleshooting",
					value: "• If you get `Connection refused`: Check that your node is running and the URL is correct\n• If your proof is invalid: Ensure your node is fully synced and try again with a newer block\n• If you can't format the commands properly: Ask for help in the support channel",
					inline: false,
				},
			]);

		await interaction.editReply({
			embeds: [registrationEmbed],
		});

		return "Registration instructions displayed successfully";
	} catch (error) {
		logger.error("Error displaying registration help:", error);
		await interaction.editReply({
			content: "Error displaying registration instructions.",
		});
		throw error;
	}
}

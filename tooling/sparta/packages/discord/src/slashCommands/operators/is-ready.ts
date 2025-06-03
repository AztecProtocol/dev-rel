import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
} from "discord.js";
import { logger } from "@sparta/utils";
import * as net from "net";

/**
 * Checks if a specific port is open on the given IP address
 * @param ip The IP address to check
 * @param port The port number to check
 * @param timeout Timeout in milliseconds (default: 5000)
 * @returns Promise<boolean> True if port is open, false otherwise
 */
async function checkPort(ip: string, port: number, timeout: number = 5000): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		
		const onError = () => {
			socket.destroy();
			resolve(false);
		};

		socket.setTimeout(timeout);
		socket.once('error', onError);
		socket.once('timeout', onError);

		socket.connect(port, ip, () => {
			socket.end();
			resolve(true);
		});
	});
}

/**
 * Validates if the provided string is a valid IP address
 * @param ip The IP address string to validate
 * @returns boolean True if valid IP address
 */
function isValidIP(ip: string): boolean {
	const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
	return ipRegex.test(ip);
}

/**
 * Handler for the operator "is-ready" command
 * Checks if the specified IP address has ports 8080 and 40400 open
 */
export async function checkNodeReadiness(
	interaction: ChatInputCommandInteraction
) {
	try {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral, // Make the response only visible to the user
		});

		// Get the IP address from the command options
		let ipAddress = interaction.options.getString("ip-address");

		// If no IP address provided, offer options to the user
		if (!ipAddress) {
			const embed = new EmbedBuilder()
				.setTitle("🏰 FORTRESS IP REQUIRED")
				.setColor(0x8B0000) // Deep red for Spartan theme
				.setDescription("**Your fortress public IP address is required, warrior!**\n\nTo check if your node is accessible to the Spartan network, you must provide your **public IP address**.")
				.addFields([
					{
						name: "🌐 Find Your Public IP Address",
						value: "**Get your public IP using one of these methods:**\n\n• **Web Browser:** Visit https://whatismyipaddress.com/\n• **Command Line:** Run `curl ifconfig.me` or `curl ipinfo.io/ip`\n• **Alternative:** Search \"what is my ip\" in Google\n\n**Then use the command:**\n```\n/operator is-ready ip-address:YOUR_PUBLIC_IP\n```",
						inline: false
					},
					{
						name: "⚠️ Important Notes",
						value: "• Your node must be running on a publicly accessible server (VPS, cloud, etc.)\n• Local/private networks cannot be checked remotely\n• Ensure ports 8080 and 40400 are open in your firewall\n• If behind NAT/router, port forwarding may be required",
						inline: false
					}
				])
				.setFooter({
					text: "Public IP required for remote fortress inspection • Sparta Defense Force"
				})
				.setTimestamp();
			
			await interaction.editReply({ embeds: [embed] });
			return;
		}

		// Validate IP address format
		if (!isValidIP(ipAddress)) {
			const embed = new EmbedBuilder()
				.setTitle("⚔️ INVALID BATTLE COORDINATES")
				.setColor(0xff0000) // Red for error
				.setDescription("The provided coordinates are not in proper format, warrior!")
				.addFields([
					{
						name: "Expected Format",
						value: "Provide a valid IPv4 address (e.g., `192.168.1.100`)",
					}
				]);
			
			await interaction.editReply({ embeds: [embed] });
			return;
		}

		// Ports to check
		const requiredPorts = [8080, 40400];
		const portResults: { port: number; isOpen: boolean }[] = [];

		// Check each port
		for (const port of requiredPorts) {
			logger.info(`Checking port ${port} on ${ipAddress}`);
			const isOpen = await checkPort(ipAddress, port);
			portResults.push({ port, isOpen });
		}

		// Determine overall readiness
		const allPortsOpen = portResults.every(result => result.isOpen);
		const closedPorts = portResults.filter(result => !result.isOpen);

		// Create the embed response
		let embed: EmbedBuilder;

		if (allPortsOpen) {
			// All ports are open - ready for battle
			embed = new EmbedBuilder()
				.setTitle("🛡️ BATTLE FORTRESS IS READY")
				.setColor(0x00ff00) // Green for success
				.setDescription(`Your fortress at \`${ipAddress}\` stands ready for battle, warrior!`)
				.addFields([
					{
						name: "🏰 Fortress Status",
						value: "**✅ BATTLE READY** - All communication channels are open",
						inline: false
					},
					{
						name: "📡 Port 8080 (HTTP Gateway)",
						value: "✅ **ACCESSIBLE** - Gateway stands open for allies",
						inline: true
					},
					{
						name: "⚡ Port 40400 (P2P Network)",
						value: "✅ **ACCESSIBLE** - Network communications established",
						inline: true
					},
					{
						name: "🏛️ Battle Orders",
						value: "Your node is visible to the Spartan network. You may proceed with confidence into battle!",
						inline: false
					}
				]);
		} else {
			// Some or all ports are closed - warning about slashing
			embed = new EmbedBuilder()
				.setTitle("⚠️ FORTRESS UNDER SIEGE - SLASHING RISK")
				.setColor(0xff8c00) // Orange for warning
				.setDescription(`Your fortress at \`${ipAddress}\` has breached defenses, warrior!`)
				.addFields([
					{
						name: "🏰 Fortress Status",
						value: "**⚠️ NOT BATTLE READY** - Communication channels compromised",
						inline: false
					}
				]);

			// Add status for each port
			for (const result of portResults) {
				const portName = result.port === 8080 ? "HTTP Gateway" : "P2P Network";
				const status = result.isOpen ? "✅ **ACCESSIBLE**" : "❌ **BLOCKED**";
				const description = result.isOpen 
					? "Channel is open for battle" 
					: "⚠️ **CRITICAL** - Channel is sealed from allies";

				embed.addFields([
					{
						name: `${result.port === 8080 ? "📡" : "⚡"} Port ${result.port} (${portName})`,
						value: `${status} - ${description}`,
						inline: true
					}
				]);
			}

			// Add warning about slashing
			embed.addFields([
				{
					name: "⚔️ WARNING: RISK OF EXILE",
					value: `**${closedPorts.length} of ${requiredPorts.length}** critical ports are blocked. ` +
						   "Your node cannot communicate properly with the Spartan network. " +
						   "**You risk being escorted out of the ranks (slashed)** if these issues persist!",
					inline: false
				},
				{
					name: "🛠️ Battle Preparations Needed",
					value: "• Check your firewall settings\n" +
						   "• Ensure port forwarding is configured\n" +
						   "• Verify your node is running and accessible\n" +
						   "• Contact your network administrators if needed",
					inline: false
				}
			]);
		}

		// Add footer with timestamp
		embed.setTimestamp();
		embed.setFooter({ 
			text: `Fortress inspection completed • Checked ports: ${requiredPorts.join(", ")}`
		});

		await interaction.editReply({ embeds: [embed] });

	} catch (error) {
		logger.error("Error executing is-ready command:", error);
		
		const embed = new EmbedBuilder()
			.setTitle("⚔️ SPARTAN SCOUT MISSION FAILED")
			.setColor(0xff0000) // Red for error
			.setDescription("Our scouts encountered an error while inspecting your fortress, warrior.")
			.addFields([
				{
					name: "Error Status",
					value: "The fortress inspection could not be completed. Try again in a moment.",
				}
			]);

		await interaction.editReply({ embeds: [embed] });
		throw error;
	}
} 
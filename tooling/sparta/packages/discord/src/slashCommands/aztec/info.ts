import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getEthereumInstance } from "@sparta/ethereum";
import { l2InfoService } from "@sparta/ethereum";
import { logger } from "@sparta/utils";
import { manageChannelMessage } from "../../utils/messageManager.js";

export const get = async (
	interaction: ChatInputCommandInteraction
): Promise<string> => {
	try {
		await interaction.deferReply();

		// Get Ethereum instance
		const ethereum = await getEthereumInstance();
		
		// Get chain info directly
		const {
			pendingBlockNum,
			provenBlockNum,
			currentEpoch,
			currentSlot,
			proposerNow,
			validators
		} = await ethereum.getRollupInfo();

		// Remove manual sync call - data is now synced automatically by epoch listener
		const networkStats = await l2InfoService.getValidatorStats();

		// Format miss rates as percentages
		const attestationMissRate = networkStats ? (networkStats.networkAttestationMissRate * 100).toFixed(1) : 'N/A';
		const proposalMissRate = networkStats ? (networkStats.networkProposalMissRate * 100).toFixed(1) : 'N/A';

		// Format top 3 countries
		let topCountriesText = '';
		if (networkStats && networkStats.top3Countries.length > 0) {
			topCountriesText = networkStats.top3Countries
				.map((c, i) => `${i + 1}. ${c.country} (${c.count.toLocaleString()} nodes)`)
				.join('\n• ');
		} else {
			topCountriesText = 'Data unavailable';
		}

		const chainMessage = await interaction.editReply({
			content: `
🛡️ **SPARTAN NETWORK REPORT** 🛡️

⚔️ **Battlefield Status:**
• Pending block: [${pendingBlockNum}](https://aztecscan.xyz/blocks/${pendingBlockNum}) - *Awaiting confirmation*
• Proven block: [${provenBlockNum}](https://aztecscan.xyz/blocks/${provenBlockNum}) - *Battle tested & secured*
• Current epoch: **${currentEpoch}** - *Era of combat*
• Current slot: **${currentSlot}** - *Position in formation*

👥 **Army Strength:**
• Total validators in set: **${validators.length}** - *Full battalion*
• Active validators (24h): **${networkStats?.activeValidators || 'N/A'}** - *Warriors in action*
• Commander on duty: [${proposerNow.slice(0, 6)}...${proposerNow.slice(-4)}](https://sepolia.etherscan.io/address/${proposerNow})

⚡ **Battle Performance:**
• Attestation miss rate: **${attestationMissRate}%** - *Soldiers missing roll call*
• Proposal miss rate: **${proposalMissRate}%** - *Commanders missing their turn*

🌍 **Global Presence:**
• Total nodes in network: **${networkStats?.totalPeersInNetwork.toLocaleString() || 'N/A'}** - *Distributed warriors*
• Top 3 battlegrounds:
• ${topCountriesText}

🏛️ The Aztec Network stands strong, warrior! 🏛️

*Check out <https://aztec.nethermind.io/> for more*`,
			flags: MessageFlags.SuppressEmbeds,
		});

		// Use the message manager utility to handle cleanup
		await manageChannelMessage(interaction, 'chain-info', chainMessage);

		return `Network stats updated. Active validators: ${networkStats?.activeValidators || 'N/A'}/${validators.length}`;
	} catch (error) {
		logger.error(error, "Error getting chain info");
		throw error;
	}
};

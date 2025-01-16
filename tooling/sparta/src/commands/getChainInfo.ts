import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { ChainInfoService } from "../services/chaininfo-service";

export default {
	data: new SlashCommandBuilder()
		.setName("get-info")
		.setDescription("Get chain info"),

	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();

		try {
			const {
				pendingBlockNum,
				provenBlockNum,
				currentEpoch,
				currentSlot,
				proposerNow,
			} = await ChainInfoService.getInfo();

			await interaction.editReply({
				content: `Pending block: ${pendingBlockNum}\nProven block: ${provenBlockNum}\nCurrent epoch: ${currentEpoch}\nCurrent slot: ${currentSlot}\nProposer now: ${proposerNow}`,
			});
		} catch (error) {
			console.error("Error in get-info command:", error);
			await interaction.editReply({
				content: `Failed to get chain info`,
			});
		}
	},
};

import { ChatInputCommandInteraction } from "discord.js";
import { ChainInfoService } from "../../../services/chaininfo-service.js";

export const get = async (
	interaction: ChatInputCommandInteraction
): Promise<void> => {
	const info = await ChainInfoService.getInfo();
	const { validators, committee } = info;

	let reply = `Current validators: ${validators.join(", ")}\n`;
	reply += `Current committee: ${committee.join(", ")}`;

	await interaction.editReply({
		content: reply,
	});
};

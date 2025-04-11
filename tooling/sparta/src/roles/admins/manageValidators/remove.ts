import { ChatInputCommandInteraction } from "discord.js";
import { ValidatorService } from "../../../services/validator-service.js";

export const remove = async (interaction: ChatInputCommandInteraction) => {
	const address = interaction.options.getString("address");
	if (!address) {
		await interaction.editReply({
			content: "Please provide an address to remove",
		});
		return `Failed`;
	}
	await ValidatorService.removeValidator(address);
	await interaction.editReply({
		content: `Removed validator ${address}`,
	});
	return "Removed validator";
};

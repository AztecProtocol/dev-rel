import { ChatInputCommandInteraction } from "discord.js";
import { ValidatorService } from "../../../services/validator-service.js";
import { validateAddress } from "@sparta/utils";

export const fund = async (interaction: ChatInputCommandInteraction) => {
	const address = validateAddress(interaction);
	if (typeof address !== "string") {
		return `Invalid address`;
	}
	await ValidatorService.fundValidator(address);
	await interaction.editReply({
		content: `Successfully funded validator ${address}`,
	});
	return "Funded validator";
};

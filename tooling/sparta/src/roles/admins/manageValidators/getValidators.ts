import { ChatInputCommandInteraction } from "discord.js";
import { paginate } from "../../../utils/pagination.js";
import { ADDRESSES_PER_PAGE } from "../../../const.js";
import { ChainInfoService } from "../../../services/chaininfo-service.js";

export const getValidators = async (
	interaction: ChatInputCommandInteraction
) => {
	const { validators, forwardedValidators } =
		await ChainInfoService.getInfo();
	await paginate(
		validators.map(
			(v, i) => `${v} -> ${forwardedValidators[i]}`
		) as string[],
		validators.length,
		ADDRESSES_PER_PAGE,
		interaction,
		"Validators (Forwarders)"
	);
	return "Checked validators";
};

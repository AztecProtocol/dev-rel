import { ChatInputCommandInteraction } from "discord.js";
import { paginate } from "../../../utils/pagination.js";
import { ChainInfoService } from "../../../services/chaininfo-service.js";
import { ADDRESSES_PER_PAGE } from "../../../const.js";

export const getCommittee = async (
	interaction: ChatInputCommandInteraction
) => {
	const { committee, forwardedCommittee } = await ChainInfoService.getInfo();

	await paginate(
		committee.map((c, i) => `${c} -> ${forwardedCommittee[i]}`) as string[],
		committee.length,
		ADDRESSES_PER_PAGE,
		interaction,
		"Committee (Forwarders)"
	);
	return "Checked committee";
};

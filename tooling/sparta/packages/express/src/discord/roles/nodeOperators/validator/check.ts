import { ChatInputCommandInteraction } from "discord.js";
import { validateAddress } from "@sparta/utils";
import { ChainInfoService } from "../../../services/chaininfo-service.js";
import { getExpectedAddress } from "@sparta/utils";

export const check = async (
	interaction: ChatInputCommandInteraction
): Promise<void> => {
	const address = validateAddress(interaction);
	if (typeof address !== "string") {
		await interaction.editReply({
			content: "Please provide a valid address",
		});
		return;
	}

	const forwarder = getExpectedAddress(
		[address as `0x${string}`],
		address as `0x${string}`
	).address;

	const info = await ChainInfoService.getInfo();
	const { validators, committee } = info;

	let reply = "Your forwarder contract is: " + forwarder + "\n";
	reply += `It is ${!validators.includes(address) && "not"} a validator\n`;
	reply += `It is ${
		!committee.includes(address) && "not"
	} a committee member\n`;

	await interaction.editReply({
		content: reply,
	});
};

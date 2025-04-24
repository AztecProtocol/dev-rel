import { ChatInputCommandInteraction } from "discord.js";
import {
	// validateAddressFromInteraction, // Old import
	// getExpectedAddress, // No longer exported from main utils
} from "@sparta/utils";
import { validateAddressFromInteraction } from "@sparta/utils/inputValidator.js"; // Direct import
import { getExpectedAddress } from "@sparta/utils/ethereum.js"; // Direct import for getExpectedAddress
import { ChainInfoService } from "../../../services/chaininfo-service.js";
import { type Hex, numberToHex } from "viem";

export const checkValidatorStatus = async (
	interaction: ChatInputCommandInteraction
) => {
	const address = validateAddressFromInteraction(interaction);
	if (!address) return;

	await interaction.deferReply({ ephemeral: true });

	const guildId = interaction.guildId as string;
	const salt = numberToHex(BigInt(guildId), { size: 32 }) as Hex;

	const { address: forwarder } = getExpectedAddress(
		[address as `0x${string}`],
		salt
	);

	const info = await ChainInfoService.getInfo();
	const { validators, committee } = info;

	let reply = "Your forwarder contract is: " + forwarder + "\n";

	if (validators.includes(address)) {
		reply += "You are listed as a validator.\n";
	} else {
		reply += "You are not listed as a validator.\n";
	}
	if (committee.includes(address)) {
		reply += "You are listed in the committee.\n";
	} else {
		reply += "You are not listed in the committee.\n";
	}

	await interaction.editReply(reply);
};

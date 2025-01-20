import { ExtendedClient } from "../types/discord.js";
import { addValidator } from "./addValidator.js";
import { getChainInfo } from "./getChainInfo.js";
import { adminValidators } from "./adminValidators.js";

export async function loadCommands(client: ExtendedClient) {
	client.commands.set("validator", addValidator);
	client.commands.set("get-info", getChainInfo);
	client.commands.set("admin", adminValidators);
}

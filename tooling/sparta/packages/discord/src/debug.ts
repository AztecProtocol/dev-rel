import { logger } from "@sparta/utils/logger";
import { NodeOperatorSubcommands } from "./types";

const commandsCount = {
	[NodeOperatorSubcommands.MyStats]: 0,
	[NodeOperatorSubcommands.ChainInfo]: 0,
	[NodeOperatorSubcommands.Start]: 0,
	[NodeOperatorSubcommands.Help]: 0,
};

export function incrementCommandsCount(command: NodeOperatorSubcommands) {
	commandsCount[command]++;
	logger.debug({ command, count: commandsCount[command] }, "Commands count");
}

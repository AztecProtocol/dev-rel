import { MessageFlags } from "discord.js";

import { ChatInputCommandInteraction } from "discord.js";

export const paginate = async (
	array: string[],
	total: number,
	perMessage: number,
	interaction: ChatInputCommandInteraction,
	message: string
) => {
	const numMessages = Math.ceil(array.length / perMessage);

	for (let i = 0; i < numMessages; i++) {
		const start = i * perMessage;
		const end = Math.min(start + perMessage, array.length);
		const validatorSlice = array.slice(start, end) as string[];

		if (i === 0) {
			await interaction.editReply({
				content: `${message} total: ${total}.\n${message} (excl. Aztec Labs) (${
					start + 1
				}-${end} of ${array.length}):\n${validatorSlice.join("\n")}`,
			});
		} else {
			await interaction.followUp({
				content: `${message} total: ${total}.\n${message} (excl. Aztec Labs) (${
					start + 1
				}-${end} of ${array.length}):\n${validatorSlice.join("\n")}`,
				flags: MessageFlags.Ephemeral,
			});
		}
	}
};

import type { Client, Collection, PermissionsBitField } from "discord.js";
import type {
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
	SlashCommandOptionsOnlyBuilder,
} from "@discordjs/builders";

export interface ExtendedClient extends Client<true> {
	commands: Collection<string, CommandModule>;
}

export interface CommandModule {
	data:
		| SlashCommandBuilder
		| SlashCommandSubcommandsOnlyBuilder
		| SlashCommandOptionsOnlyBuilder;
	execute: (interaction: DiscordInteraction) => Promise<InteractionResponse>;
}

export interface CommandOption {
	name: string;
	value?: string;
	options?: CommandOption[];
	type: ApplicationCommandOptionType;
}

// https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
export enum ApplicationCommandOptionType {
	SUB_COMMAND = 1,
	SUB_COMMAND_GROUP = 2,
	STRING = 3,
	INTEGER = 4,
	BOOLEAN = 5,
	USER = 6,
	CHANNEL = 7,
	ROLE = 8,
	MENTIONABLE = 9,
	NUMBER = 10,
	ATTACHMENT = 11,
}

export interface DiscordInteraction {
	data: {
		name: string;
		options?: CommandOption[];
	};
}

export interface InteractionResponse {
	type: InteractionResponseType;
	data: {
		content: string;
		flags: MessageFlags;
	};
}

// https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object-interaction-callback-type
export enum InteractionResponseType {
	PONG = 1,
	CHANNEL_MESSAGE_WITH_SOURCE = 4,
	DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
	DEFERRED_UPDATE_MESSAGE = 6,
	UPDATE_MESSAGE = 7,
	APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
	MODAL = 9,
	PREMIUM_REQUIRED = 10,
}

// https://discord.com/developers/docs/resources/channel#message-object-message-flags
export enum MessageFlags {
	EPHEMERAL = 64,
}

export const createMockResponse = (content: string): InteractionResponse => ({
	type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
	data: {
		content: `MOCK - ${content}`,
		flags: MessageFlags.EPHEMERAL,
	},
});

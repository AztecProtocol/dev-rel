/**
 * @fileoverview Command types for Discord roles
 * @description Defines types and enums for Discord command handlers
 * @module sparta/discord/roles/types
 */

// Moderator command enums
export enum ModeratorSubcommandGroups {
	Moderator = "mod",
}

export enum ModeratorSubcommands {
	Info = "info",
	Approve = "approve",
	Help = "help",
}

// Node Operator command enums
export enum NodeOperatorSubcommandGroups {
	Operator = "operator",
}

export enum NodeOperatorSubcommands {
	ChainInfo = "chain-info",
	MyStats = "my-stats",
	Start = "start",
	Help = "help",
	AddValidator = "add-validator",
}

// Other role-related enums
export enum PassportRoles {
	Verified = "Verified+", // Base role for verification
}

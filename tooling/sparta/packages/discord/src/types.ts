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
	Unapprove = "unapprove",
	Help = "help",
	AddValidator = "add-validator",
}

// Node Operator command enums
export enum NodeOperatorSubcommandGroups {
	Operator = "operator"
}

export enum NodeOperatorSubcommands {
	MyStats = "my-stats",
	AddValidator = "add-validator",
	Help = "help",
	IsReady = "is-ready",
}

export enum AztecSubcommandGroups {
	Aztec = "aztec",
}

export enum AztecSubcommands {
	Info = "info",
}
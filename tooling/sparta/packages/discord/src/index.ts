/**
 * @fileoverview Main Discord package entry point
 * @description Exports all Discord package components
 * @module sparta/discord
 */

// Export API-related components
export { ApiProvider } from "./api/apiProvider";
export { clientPromise } from "./api/axios";

// Export clients
export { Discord, getDiscordInstance } from "./clients/discord";

// Export services
export { DiscordService, discordService } from "./services";

// Export utils
export { _handleUserRoleAssignment } from "./utils/roleAssigner";

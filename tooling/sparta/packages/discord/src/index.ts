/**
 * @fileoverview Main Discord package entry point
 * @description Exports all Discord package components
 * @module sparta/discord
 */

// Export API-related components
export { ApiProvider } from "@sparta/utils/openapi/api/apiProvider";
export { clientPromise } from "@sparta/utils/openapi/api/axios";

// Export clients
export { Discord, getDiscordInstance } from "./clients/discord";

// Export services
export { DiscordService, discordService } from "./services";
export { DiscordWebhookService, discordWebhookService } from "./services/discord-webhook";

// Export utils
export { _handleUserRolesAssignment } from "./utils/roleAssigner";
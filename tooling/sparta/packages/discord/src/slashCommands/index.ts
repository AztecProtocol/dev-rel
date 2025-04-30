/**
 * @fileoverview Roles module exports
 * @description Centralizes exports for all Discord role-related commands
 * @module sparta/discord/roles
 */

import humansCommands from "./humans/index";
import operatorsCommands from "./operators/index";
import moderatorsCommands from "./moderators/index";
export * from "../types";

// Export roles commands
export default { humansCommands, operatorsCommands, moderatorsCommands };

/**
 * @fileoverview Common utils for Sparta
 */

// export * from "./ethereum.js"; // Remove export - Server-side specific
// Note: Ethereum functionality has been moved to @sparta/ethereum package
export { logger } from "./logger.js";
export { default as dynamoDB } from "./dynamo-db.js";
// export * from "./inputValidator.js"; // Remove export - Discord specific
export * from "./const/index.js";
export type { OpenAPIV3 } from "openapi-types";
import apiDocs from "./openapi/api-docs.json";
export { apiDocs };

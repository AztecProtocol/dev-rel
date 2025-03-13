/**
 * @fileoverview Main entry point for the Sparta Discord bot
 * @description Initializes the Ethereum client and Discord bot services
 * @module sparta/index
 */

import { Ethereum } from "./utils/ethereum.js";

// Initialize Ethereum client as a singleton
export const ethereum = await Ethereum.new();

import "./discord/index.js";

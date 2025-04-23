/**
 * @fileoverview Passport service for Human Passport scoring integration
 * @description Provides methods for integrating with the Human Passport API
 * @module sparta/services/passport-service
 */

import axios from "axios";
import { logger, inMemoryDB } from "@sparta/utils";
import { type DiscordService } from "./discord-service.js";

/**
 * Human Passport Role constants
 */
export enum PassportRoles {
	Verified = "Passport Verified", // Base role for verification
}

/**
 * Configuration for the Passport service
 */
interface PassportConfig {
	scorerId: string;
	minimumScore: number;
	apiKey: string;
}

/**
 * Response types for Passport API calls
 */
interface MessageAndNonceResponse {
	message: string;
	nonce: string;
}

interface PassportScoreResponse {
	address: string;
	score: string;
	status: "DONE" | "PROCESSING" | "ERROR";
	last_score_timestamp?: string;
	evidence?: any;
	error?: string;
}

/**
 * Service for integrating with Human Passport API
 *
 * This service provides methods for:
 * - Fetching signing messages from Passport API
 * - Submitting passport score requests
 * - Polling for score results
 * - Verifying scores against thresholds
 */
export class PassportService {
	private static instance: PassportService;
	private discordService: DiscordService;
	private readonly config: PassportConfig;

	private constructor(discordService: DiscordService) {
		this.discordService = discordService;

		// Load configuration from environment variables
		this.config = {
			scorerId: process.env.PASSPORT_SCORER_ID || "",
			minimumScore: parseFloat(
				process.env.PASSPORT_MINIMUM_SCORE || "0.5"
			),
			apiKey: process.env.PASSPORT_API_KEY || "",
		};

		// Validate required configuration
		if (!this.config.scorerId || !this.config.apiKey) {
			logger.error(
				"Passport service configuration incomplete - missing scorer ID or API key"
			);
		}
	}

	/**
	 * Gets the singleton instance of the Passport service
	 *
	 * @returns {PassportService} The singleton instance
	 */
	public static getInstance(discordService: DiscordService): PassportService {
		if (!PassportService.instance) {
			PassportService.instance = new PassportService(discordService);
		}
		return PassportService.instance;
	}

	/**
	 * Fetches a message and nonce from the Passport API for signing
	 *
	 * @returns {Promise<MessageAndNonceResponse | null>} The message and nonce, or null if there was an error
	 */
	public async getMessageAndNonce(): Promise<MessageAndNonceResponse | null> {
		try {
			const config = {
				headers: {
					"X-API-KEY": this.config.apiKey,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
			};

			const { data } = await axios.get(
				"https://api.scorer.gitcoin.co/registry/signing-message",
				config
			);

			return data;
		} catch (error: any) {
			logger.error(
				{ error: error.message },
				"Error fetching Passport signing message"
			);
			return null;
		}
	}

	/**
	 * Submits a passport for scoring
	 *
	 * @param {string} address - Wallet address to score
	 * @param {string} signature - Signed message from wallet
	 * @param {string} nonce - Nonce from the signing message request
	 * @returns {Promise<boolean>} True if submission was successful, false otherwise
	 */
	public async submitPassport(
		address: string,
		signature: string,
		nonce: string
	): Promise<boolean> {
		try {
			// Validate address format
			if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
				logger.error({ address }, "Invalid Ethereum address format");
				return false;
			}

			const config = {
				headers: {
					"X-API-KEY": this.config.apiKey,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
			};

			const body = {
				address,
				community: this.config.scorerId,
				signature,
				nonce,
			};

			const response = await axios.post(
				"https://api.scorer.gitcoin.co/registry/submit-passport",
				body,
				config
			);

			if (response.status !== 200) {
				logger.error(
					{ status: response.status, data: response.data },
					"Error submitting passport for scoring"
				);
				return false;
			}

			return true;
		} catch (error: any) {
			logger.error(
				{ error: error.message, address },
				"Error submitting passport for scoring"
			);
			return false;
		}
	}

	/**
	 * Fetches the score for an address
	 *
	 * @param {string} address - Wallet address to get score for
	 * @returns {Promise<PassportScoreResponse | null>} The score response, or null if there was an error
	 */
	public async getScore(
		address: string
	): Promise<PassportScoreResponse | null> {
		try {
			const config = {
				headers: {
					"X-API-KEY": this.config.apiKey,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
			};

			const { data } = await axios.get(
				`https://api.scorer.gitcoin.co/registry/score/${this.config.scorerId}/${address}`,
				config
			);

			return data;
		} catch (error: any) {
			logger.error(
				{ error: error.message, address },
				"Error fetching passport score"
			);
			return null;
		}
	}

	/**
	 * Polls for a score until it's ready or times out
	 *
	 * @param {string} address - Wallet address to get score for
	 * @param {number} maxRetries - Maximum number of retry attempts
	 * @param {number} delayMs - Delay between retries in milliseconds
	 * @returns {Promise<PassportScoreResponse | null>} The final score response, or null if timed out
	 */
	public async pollForScore(
		address: string,
		maxRetries: number = 10,
		delayMs: number = 2000
	): Promise<PassportScoreResponse | null> {
		let retries = 0;

		while (retries < maxRetries) {
			const scoreResponse = await this.getScore(address);

			if (!scoreResponse) {
				return null;
			}

			if (scoreResponse.status === "DONE") {
				return scoreResponse;
			}

			if (scoreResponse.status === "ERROR") {
				logger.error(
					{ error: scoreResponse.error, address },
					"Error scoring passport"
				);
				return scoreResponse;
			}

			// Wait before trying again
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			retries++;
		}

		logger.error(
			{ address, maxRetries },
			"Timed out waiting for passport score"
		);
		return null;
	}

	/**
	 * Processes a complete verification flow from start to finish
	 *
	 * @param {string} sessionId - The verification session ID
	 * @param {string} signature - The signature from the wallet
	 * @returns {Promise<boolean>} True if verification and role assignment were successful
	 */
	public async processVerification(
		sessionId: string,
		signature: string
	): Promise<boolean> {
		try {
			// Get the session
			const session = inMemoryDB.getSession(sessionId);
			if (!session || !session.walletAddress || !session.nonce) {
				logger.error({ sessionId }, "Invalid session for verification");
				return false;
			}

			// Submit the passport for scoring
			const submitSuccess = await this.submitPassport(
				session.walletAddress,
				signature,
				session.nonce
			);

			if (!submitSuccess) {
				logger.error(
					{ sessionId, address: session.walletAddress },
					"Failed to submit passport for scoring"
				);
				return false;
			}

			// Update the session with the signature
			inMemoryDB.updateSignature(sessionId, signature);

			// Poll for the score
			const scoreResponse = await this.pollForScore(
				session.walletAddress
			);

			if (!scoreResponse || scoreResponse.status !== "DONE") {
				logger.error(
					{ sessionId, address: session.walletAddress },
					"Failed to retrieve passport score"
				);
				return false;
			}

			// Parse the score
			const score = parseFloat(scoreResponse.score);

			// Update the session with the score
			const verified = score >= this.config.minimumScore;
			inMemoryDB.updateVerificationStatus(sessionId, verified, score);

			logger.info(
				{
					sessionId,
					address: session.walletAddress,
					score,
					threshold: this.config.minimumScore,
					verified,
				},
				"Passport verification result"
			);

			// If verified, assign the role
			if (verified) {
				const roleAssigned = await this.discordService.assignRole(
					session.discordUserId,
					PassportRoles.Verified
				);

				if (roleAssigned) {
					inMemoryDB.markRoleAssigned(sessionId);
					return true;
				} else {
					logger.error(
						{ sessionId, userId: session.discordUserId },
						"Failed to assign role after successful verification"
					);
					return false;
				}
			}

			return verified;
		} catch (error: any) {
			logger.error(
				{ error: error.message, sessionId },
				"Error processing verification"
			);
			return false;
		}
	}

	/**
	 * Gets the current minimum score threshold
	 *
	 * @returns {number} The minimum score threshold
	 */
	public getMinimumScore(): number {
		return this.config.minimumScore;
	}
}

export default PassportService;

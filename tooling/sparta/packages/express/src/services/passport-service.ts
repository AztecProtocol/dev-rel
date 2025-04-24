/**
 * @fileoverview Passport service for Human Passport scoring integration
 * @description Provides methods for integrating with the Human Passport API v2
 * @module sparta/services/passport-service
 */

import axios from "axios";
import { logger, inMemoryDB } from "@sparta/utils";

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
 * Response from a passport score request
 */
interface PassportScoreResponse {
	address: string;
	score: string;
	passing_score: boolean;
	last_score_timestamp?: string;
	expiration_timestamp?: string;
	threshold: string;
	status?: "DONE" | "PROCESSING" | "ERROR";
	error?: string;
	stamps?: Record<string, {
		score: string;
		dedup: boolean;
		expiration_date: string;
	}>;
}

/**
 * Service for integrating with Human Passport API v2
 *
 * This service provides methods for:
 * - Submitting passport score requests
 * - Verifying scores against thresholds
 */
export class PassportService {
	private static instance: PassportService;
	private readonly config: PassportConfig;

	private constructor() {
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
	 * Gets the singleton instance of the service
	 * @returns {PassportService} The service instance
	 */
	public static getInstance(): PassportService {
		if (!PassportService.instance) {
			PassportService.instance = new PassportService();
		}
		return PassportService.instance;
	}

	/**
	 * Fetches the score for an address using the v2 API
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
				`https://api.passport.xyz/v2/stamps/${this.config.scorerId}/score/${address}`,
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
	 * Processes verification for an address
	 *
	 * @param {string} sessionId - The verification session ID
	 * @param {string} signature - The signature from the wallet
	 * @returns {Promise<boolean>} True if verification was successful
	 */
	public async processVerification(
		sessionId: string,
		signature: string
	): Promise<boolean> {
		try {
			// Get the session
			const session = inMemoryDB.getSession(sessionId);
			if (!session || !session.walletAddress) {
				logger.error({ sessionId }, "Invalid session for verification");
				return false;
			}

			// Update the session with the signature
			inMemoryDB.updateSignature(sessionId, signature);
			// Update session status
			inMemoryDB.updateSession(sessionId, { status: "submitted" });

			// Get the score directly
			const scoreResponse = await this.getScore(
				session.walletAddress
			);

			if (!scoreResponse) {
				logger.error(
					{ sessionId, address: session.walletAddress },
					"Failed to retrieve passport score"
				);
				// Update session status
				inMemoryDB.updateSession(sessionId, { status: "score_retrieval_failed" });
				return false;
			}

			// Parse the score
			const score = parseFloat(scoreResponse.score);
			const lastScoreTimestamp = scoreResponse.last_score_timestamp ? 
				new Date(scoreResponse.last_score_timestamp).getTime() : 
				Date.now();

			// Update the session with the score and timestamp
			const verified = score >= this.config.minimumScore;
			inMemoryDB.updateSession(sessionId, {
				score,
				lastScoreTimestamp,
				verified,
				status: verified ? "verified" : "verification_failed"
			});

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

			return verified;
		} catch (error: any) {
			logger.error(
				{ error: error.message, sessionId },
				"Error processing verification"
			);
			// Update session status
			inMemoryDB.updateSession(sessionId, { status: "error" });
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

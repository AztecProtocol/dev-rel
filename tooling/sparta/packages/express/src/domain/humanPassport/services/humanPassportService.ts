/**
 * @fileoverview Passport service for Human Passport scoring integration
 * @description Provides methods for integrating with the Human Passport API v2
 * @module sparta/services/passport-service
 */

import axios from "axios";
import { logger /*, dynamoDB */ } from "@sparta/utils";
/**
 * Configuration for the Passport service
 */
interface PassportConfig {
	scorerId: string;
	minimumScore: number;
	highScoreThreshold: number; // Threshold for high score role
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
			minimumScore: parseInt(process.env.MINIMUM_SCORE || '0'),
			highScoreThreshold: parseInt(process.env.HIGH_SCORE_THRESHOLD || '10'),
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
	 * Gets the current minimum score threshold
	 *
	 * @returns {number} The minimum score threshold
	 */
	public getMinimumScore(): number {
		return this.config.minimumScore;
	}

	/**
	 * Gets the high score threshold
	 *
	 * @returns {number} The high score threshold
	 */
	public getHighScoreThreshold(): number {
		return this.config.highScoreThreshold;
	}
}

export default PassportService;

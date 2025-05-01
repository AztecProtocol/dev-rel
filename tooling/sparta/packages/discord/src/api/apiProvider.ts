import { clientPromise } from "./axios";
import type { Client as ApiClient } from "@sparta/utils/openapi/types";
import { logger } from "@sparta/utils";

/**
 * Singleton class to provide access to the API client
 */
export class ApiProvider {
	private static instance: ApiProvider | null = null;
	private client: ApiClient | null = null;
	private error: Error | null = null;

	private constructor() {
		// Private constructor to enforce singleton pattern
	}

	/**
	 * Get the singleton instance of ApiProvider
	 */
	public static getInstance(): ApiProvider {
		if (!ApiProvider.instance) {
			ApiProvider.instance = new ApiProvider();
		}
		return ApiProvider.instance;
	}

	/**
	 * Initialize the API client
	 */
	public async init(): Promise<void> {
		if (this.client) return; // Already initialized

		try {
			logger.info("Initializing API client");
			this.client = await clientPromise;
			logger.info("API client initialized successfully");
			this.error = null;
		} catch (err) {
			this.error = err instanceof Error ? err : new Error(String(err));
			logger.error(
				{
					error: this.error,
					message: this.error.message,
					stack: this.error.stack,
					apiUrl:
						process.env.VITE_APP_API_URL || "http://localhost:3000",
					apiKeyPresent: !!process.env.BACKEND_API_KEY,
				},
				"ApiProvider: Failed to initialize client"
			);
		}
	}

	/**
	 * Get the API client
	 * @throws Error if client is not initialized
	 */
	public getClient(): ApiClient {
		if (!this.client) {
			const error = new Error(
				"API client not initialized. Call init() first."
			);
			logger.error({ error }, "Failed to get API client");
			throw error;
		}
		return this.client;
	}

	/**
	 * Check if the client is initialized
	 */
	public isInitialized(): boolean {
		return !!this.client;
	}

	/**
	 * Get the initialization error, if any
	 */
	public getError(): Error | null {
		return this.error;
	}
}

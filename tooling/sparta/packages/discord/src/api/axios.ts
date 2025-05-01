import { OpenAPIClientAxios } from "openapi-client-axios";
import { apiDocs } from "@sparta/utils";
import { type Client } from "@sparta/utils/openapi/types";
import { logger } from "@sparta/utils";

// Log environment variables related to API configuration
logger.info(
	{
		apiUrl: process.env.VITE_APP_API_URL,
		nodeEnv: process.env.NODE_ENV,
	},
	"API client configuration"
);

const apiInstance = new OpenAPIClientAxios({
	// @ts-ignore
	definition: apiDocs,
	axiosConfigDefaults: {
		baseURL: process.env.VITE_APP_API_URL || "http://localhost:3000",
		timeout: 10_000,
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"x-api-key": process.env.BACKEND_API_KEY,
		},
		// Adding option to allow absolute URLs
		allowAbsoluteUrls: true,
	},
});

// Initialize and export the promise directly
export const clientPromise = apiInstance
	.init<Client>()
	.then((client) => {
		// Log the configured base URL of the client
		logger.info(
			{ baseURL: apiInstance.getAxiosInstance().defaults.baseURL },
			"API client initialized"
		);
		return client;
	})
	.catch((err) => {
		console.error("axios.ts: Client init() failed:", err);
		throw err;
	});

// packages/vite/src/api/axios.ts
import { type OpenAPIV3, OpenAPIClientAxios } from "openapi-client-axios";
import spec from "../api-docs.json";
import type { Client } from "../types";

// Construct API URL from environment variables or use the provided API_URL directly
const apiUrl = process.env.API_URL || 
  `${process.env.API_PROTOCOL || 'http'}://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || '3000'}`;

// Make sure we always have a proper API URL
if (!apiUrl) {
  console.warn("API_URL is not set. Defaulting to http://localhost:3000");
}

console.log("Initializing API client with baseURL:", apiUrl);

const apiInstance = new OpenAPIClientAxios({
	definition: spec as OpenAPIV3.Document,
	axiosConfigDefaults: {
		baseURL: apiUrl,
		timeout: 30_000,
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"x-api-key": process.env.BACKEND_API_KEY,
		},
	},
});

// Initialize and export the promise directly
export const clientPromise = apiInstance
	.init<Client>()
	.then((client) => {
		return client;
	})
	.catch((err) => {
		console.error("axios.ts: Client init() failed:", err);
		throw err;
	});

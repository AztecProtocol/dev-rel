// packages/vite/src/api/axios.ts
import { type OpenAPIV3, OpenAPIClientAxios } from "openapi-client-axios";
import spec from "@sparta/utils/openapi/api-docs.json";
import type { Client } from "@sparta/utils/openapi/types";

const apiInstance = new OpenAPIClientAxios({
	definition: spec as OpenAPIV3.Document,
	// validate: false, // Invalid option, removed
	axiosConfigDefaults: {
		baseURL: process.env.VITE_APP_API_URL,
		timeout: 10_000,
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
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

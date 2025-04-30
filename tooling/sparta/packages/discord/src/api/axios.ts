import { OpenAPIClientAxios } from "openapi-client-axios";
import { apiDocs } from "@sparta/utils";
import { type Client } from "@sparta/utils/openapi/types";

const apiInstance = new OpenAPIClientAxios({
	definition: apiDocs,
	axiosConfigDefaults: {
		baseURL: process.env.API_URL || "http://localhost:3000",
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

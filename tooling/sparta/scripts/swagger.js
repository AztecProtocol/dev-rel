// generate.js
import swaggerJSDoc from "swagger-jsdoc";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Define default API URL with fallbacks
const apiUrl = process.env.API_URL || 
    `${process.env.API_PROTOCOL || 'http'}://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || '3000'}`;

console.log(`Generating OpenAPI docs with base URL: ${apiUrl}`);

// swaggerOptions.js
export const swaggerDefinition = {
	openapi: "3.0.0",
	info: {
		title: "Sparta API",
		version: "1.0.0",
		description: "…",
	},
	servers: [
		{
			url: "{serverUrl}",
			description: "Sparta API",
			variables: {
				serverUrl: {
					default: apiUrl,
					description: "API server URL"
				}
			}
		},
	],
	components: {
		/* schemas & securitySchemes */
	},
};

export const options = {
	definition: swaggerDefinition,
	apis: ["packages/express/src/routes/**/*.ts"], // wherever your @openapi JSDoc lives
};

const spec = swaggerJSDoc(options);

console.log(spec);
fs.writeFileSync(
	path.resolve("packages/utils/openapi/api-docs.json"),
	JSON.stringify(spec, null, 2)
);

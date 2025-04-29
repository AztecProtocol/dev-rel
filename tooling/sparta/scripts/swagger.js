// generate.js
import swaggerJSDoc from "swagger-jsdoc";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

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
			url: `${process.env.VITE_APP_API_URL}`,
			description: "Sparta API",
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
	path.resolve("packages/vite/src/api-docs.json"),
	JSON.stringify(spec, null, 2)
);

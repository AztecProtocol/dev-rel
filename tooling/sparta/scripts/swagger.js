// generate.js
import swaggerJSDoc from "swagger-jsdoc";
import fs from "fs";
import path from "path";

// swaggerOptions.js
export const swaggerDefinition = {
	openapi: "3.0.0",
	info: {
		title: "Sparta API",
		version: "1.0.0",
		description: "…",
	},
	servers: [{ url: "http://localhost:3000", description: "Local dev" }],
	components: {
		/* schemas & securitySchemes */
	},
};

export const options = {
	definition: swaggerDefinition,
	apis: ["packages/express/src/routes/**/*.ts"], // wherever your @openapi JSDoc lives
};

const spec = swaggerJSDoc(options);
fs.writeFileSync(
	path.resolve("packages/vite/src/api-docs.json"),
	JSON.stringify(spec, null, 2)
);

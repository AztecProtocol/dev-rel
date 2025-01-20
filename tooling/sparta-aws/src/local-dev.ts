import express, { Request, Response } from "express";
import { handler } from "./index.js";
import { verifyKey } from "discord-interactions";
import dotenv from "dotenv";
import { APIGatewayProxyEvent } from "aws-lambda";

dotenv.config();

const app = express();
const port = process.env["PORT"] || 3000;

// Logging middleware
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
	console.log("Headers:", req.headers);
	next();
});

// Raw body buffer handling for all routes
app.use(express.raw({ type: "*/*" }));

// Handle Discord interactions
app.post("/discord-webhook", async (req: Request, res: Response) => {
	try {
		const signature = req.headers["x-signature-ed25519"];
		const timestamp = req.headers["x-signature-timestamp"];
		const body = req.body; // This will be a raw buffer

		console.log("Received Discord interaction:");
		console.log("Signature:", signature);
		console.log("Timestamp:", timestamp);
		console.log("Body:", body.toString());

		if (!signature || !timestamp) {
			console.log("Missing signature or timestamp");
			return res.status(401).json({ error: "Invalid request signature" });
		}

		const isValid = verifyKey(
			body,
			signature as string,
			timestamp as string,
			process.env["DISCORD_PUBLIC_KEY"]!
		);

		console.log("Verification result:", isValid);

		if (!isValid) {
			console.log("Invalid signature");
			return res.status(401).json({ error: "Invalid request signature" });
		}

		const event: APIGatewayProxyEvent = {
			body: body.toString(),
			headers: {
				"x-signature-ed25519": String(signature || ""),
				"x-signature-timestamp": String(timestamp || ""),
			},
			multiValueHeaders: {},
			httpMethod: "POST",
			isBase64Encoded: false,
			path: "/discord-webhook",
			pathParameters: null,
			queryStringParameters: null,
			multiValueQueryStringParameters: null,
			stageVariables: null,
			requestContext: {
				accountId: "",
				apiId: "",
				authorizer: {},
				protocol: "HTTP/1.1",
				httpMethod: "POST",
				identity: {
					accessKey: null,
					accountId: null,
					apiKey: null,
					apiKeyId: null,
					caller: null,
					clientCert: null,
					cognitoAuthenticationProvider: null,
					cognitoAuthenticationType: null,
					cognitoIdentityId: null,
					cognitoIdentityPoolId: null,
					principalOrgId: null,
					sourceIp: String(req.ip || ""),
					user: null,
					userAgent: String(req.headers["user-agent"] || ""),
					userArn: null,
				},
				path: "/discord-webhook",
				stage: "prod",
				requestId: "",
				requestTimeEpoch: Date.now(),
				resourceId: "",
				resourcePath: "/discord-webhook",
			},
			resource: "/discord-webhook",
		};

		const result = await handler(event);
		console.log("Handler response:", result);
		res.status(result.statusCode).json(JSON.parse(result.body));
	} catch (error) {
		console.error("Error handling request:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
	res.json({ status: "ok" });
});

app.listen(port, () => {
	console.log(`Local development server running at http://localhost:${port}`);
});

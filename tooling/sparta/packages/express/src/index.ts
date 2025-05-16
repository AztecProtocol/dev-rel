import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";
// import { dynamoDB } from "@sparta/utils"; // Unused
import { getDiscordInstance } from "@sparta/discord";
import { logger } from "@sparta/utils";
import path from "path"; // Import path module
import { fileURLToPath } from "url"; // Import fileURLToPath for ES modules

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let allowedOrigins: string[] = [];
const corsAllowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
const nodeEnv = process.env.NODE_ENV;

if (corsAllowedOriginsEnv) {
	// Use origins from environment variable if provided
	allowedOrigins = corsAllowedOriginsEnv
		.split(",")
		.map((origin) => origin.trim());
} else if (nodeEnv === "development") {
	// Default origins for local development if variable is not set
	allowedOrigins = [
		"http://localhost:3000", // Allow Express itself if serving frontend
		"http://localhost:5173", // Default Vite dev port
		"http://192.168.100.52:3000", // Allow local IP address
	];
} // In non-development environments, if CORS_ALLOWED_ORIGINS is not set, allowedOrigins remains empty (most restrictive)

logger.info({ nodeEnv, resolvedOrigins: allowedOrigins }, "Initializing CORS");

const corsOptions = {
	origin: function (
		origin: string | undefined,
		callback: (err: Error | null, allow?: boolean) => void
	) {
		// Allow requests with no origin (like mobile apps, curl, server-to-server)
		if (!origin) {
			logger.debug("CORS: Allowing request with no origin");
			return callback(null, true);
		}
		// Check if the origin is in the allowed list
		if (allowedOrigins.includes(origin)) {
			logger.debug({ origin }, "CORS: Allowing request from origin");
			callback(null, true);
		} else {
			logger.warn(
				{ origin, allowedOrigins },
				"CORS: Blocking request from disallowed origin"
			);
			callback(new Error(`Origin ${origin} not allowed by CORS`), false);
		}
	},
	methods: ["GET", "POST", "OPTIONS"], // Specify allowed methods
	allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
	credentials: true, // Allow cookies/authorization headers
	optionsSuccessStatus: 204, // Return 204 for preflight requests
};

const app = express();
const distDir = path.resolve(__dirname, "../../vite/dist");
const viteIndexHtml = path.resolve(distDir, "index.html");

// Serve static assets from distDir (like JS, CSS) - removing index: false
app.use(express.static(distDir));

// Debug middleware to log all requests
app.use((req, _res, next) => {
	console.log(
		`${new Date().toISOString()} | ${req.method} ${req.url} | Origin: ${
			req.headers.origin || "No origin"
		}`
	);
	next();
});

// Middleware
app.use(cors(corsOptions));
// API Routes
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

// Start server
app.listen(process.env.API_PORT as unknown as number, "0.0.0.0", async () => {
	console.log(`Server is running on port ${process.env.API_PORT}`);
	console.log(`Allowing CORS for: ${allowedOrigins.join(", ")}`);
	console.log(
		`API Documentation available at: ${process.env.API_URL}/api-docs`
	);

	// Start Discord Bot and then the background processor
	try {
		// Wait for the client to be ready (login happens in Discord.new)
		const discord = await getDiscordInstance();
		discord.getClient().once("ready", async () => {
			logger.info("Discord bot client is ready.");
		});
		// Log that we are waiting for the ready event
		logger.info("Waiting for Discord bot client to signal ready...");
	} catch (error) {
		logger.error({ error }, "Failed to start Discord bot client.");
		// Decide if the server should exit or run without the bot
		process.exit(1);
	}
});

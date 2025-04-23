/**
 * @fileoverview Express server setup for internal API endpoints within the Discord bot.
 */

import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import cors from "cors";
import { logger } from "@sparta/utils";
import passportRoutes from "./routes/passport-routes.js"; // Fixed import extension
import path from "path"; // Added import
import { fileURLToPath } from "url"; // Added for robust path calculation

// Calculate the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.BOT_API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- Serve React App Static Files ---
// Use path relative to the current module directory for robustness
const reactAppBuildPath = path.resolve(__dirname, "../vite/dist");
// Log the calculated path for debugging
logger.info({ reactAppBuildPath }, "Serving React app static files from");
app.use(express.static(reactAppBuildPath));

// --- Mount API Routes ---
app.use("/internal/passport", passportRoutes); // Using /internal prefix

// --- Catch-all for React Router ---
// This needs to be after API routes but before the error handler
app.get("*", (req, res) => {
	// Check if the request looks like it's for a file (e.g., has an extension)
	// or if it's an API route, otherwise serve index.html
	if (!req.path.includes(".") && !req.path.startsWith("/internal/")) {
		res.sendFile(path.join(reactAppBuildPath, "index.html"));
	} else {
		// Let the static handler or API routes handle it, or eventually 404
		// If we let it fall through without calling next(), it might hang
		// Let the default 404 handler catch it if static/API didn't.
		// Or explicitly call next() if we want the error handler below to catch it?
		// Let's stick with sending the index.html or letting other middleware handle it.
		// A simple `next()` here might be better if we want a consistent 404 from express.
		// For now, assume if it's not handled by static or API, it's not found.
		// A better approach might be needed depending on desired 404 behavior.
		// Reverting to a simpler '*' catch-all that just sends index.html
		// as the static middleware should handle existing files first.
		// No, the previous logic was better to avoid serving index.html for missing static assets.
		// Let's refine the catch-all slightly.
		res.status(404).send("Not Found"); // Send 404 if not API and not a file likely handled by static
	}
});

// --- Error Handling ---
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	logger.error(
		{ error: err.message, stack: err.stack },
		"Discord Bot API server error"
	);
	res.status(500).json({
		success: false,
		error: "Internal server error",
	});
});

// --- Start Server Function ---
export const startBotApiServer = () => {
	try {
		app.listen(PORT, () => {
			logger.info(
				`Discord Bot internal API server running on port ${PORT}`
			);
		});
	} catch (error: any) {
		logger.error(
			{ error: error.message },
			"Failed to start Discord Bot internal API server"
		);
		process.exit(1); // Exit if the internal API server fails to start
	}
};

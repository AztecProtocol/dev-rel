import express from 'express';
import cors from 'cors';
import passportRoutes from './routes/passport-routes.js';
import { swaggerSpec, swaggerUi } from './swagger.js';
// import { dynamoDB } from "@sparta/utils"; // Unused
import { discord } from './discord/clients/discord.js';
import { logger } from '@sparta/utils';
import path from 'path'; // Import path module
import { fileURLToPath } from 'url'; // Import fileURLToPath for ES modules

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define constants for session status (assuming these exist elsewhere or should be defined)
// const PENDING_ROLE_STATUS = 'pending_role_assignment'; // Removed local definition

const app = express();

// --- CORS Configuration --- START
let allowedOrigins: string[] = [];
const corsAllowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
const nodeEnv = process.env.NODE_ENV;

if (corsAllowedOriginsEnv) {
  // Use origins from environment variable if provided
  allowedOrigins = corsAllowedOriginsEnv.split(',').map(origin => origin.trim());
} else if (nodeEnv === 'development') {
  // Default origins for local development if variable is not set
  allowedOrigins = [
    'http://localhost:3000', // Allow Express itself if serving frontend
    'http://localhost:5173', // Default Vite dev port
    'http://192.168.100.52:3000' // Allow local IP address
  ];
} // In non-development environments, if CORS_ALLOWED_ORIGINS is not set, allowedOrigins remains empty (most restrictive)

logger.info({ nodeEnv, corsAllowedOriginsEnv, resolvedOrigins: allowedOrigins }, "Initializing CORS");

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
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
      logger.warn({ origin, allowedOrigins }, "CORS: Blocking request from disallowed origin");
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'], // Specify allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
  credentials: true, // Allow cookies/authorization headers
  optionsSuccessStatus: 204 // Return 204 for preflight requests
};

// --- CORS Configuration --- END

// Debug middleware to log all requests
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url} | Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Define path to static frontend files (built by Vite)
// Assumes Dockerfile copies vite/dist to /app/public relative to this file's final location
// Adjust the relative path if your build output or Dockerfile structure differs.
// When built, this file might be in /app/packages/express/dist/src/, so we go up 3 levels.
const staticFilesPath = path.join(__dirname, '..', '..', '..', 'packages', 'vite', 'dist');
logger.info(`Serving static files from: ${staticFilesPath}`);

// --- Static File Serving --- START
// Serve static files (HTML, CSS, JS from Vite build)
app.use(express.static(staticFilesPath));
// --- Static File Serving --- END

// Swagger documentation (keep before API routes if you want /api-docs separate)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }' // Hide the top bar (optional)
}));

// Serve the Swagger spec as JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/api', passportRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --- SPA Catch-all Route --- START
// This should be AFTER API routes and static serving middleware
// It ensures that requests not matching API routes or static files
// are served the index.html, allowing client-side routing to take over.
app.get('*', (req, res) => {
  // Avoid serving index.html for API-like paths just in case
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).send('API route not found');
  }
  const indexPath = path.join(staticFilesPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      logger.error({ error: err, path: indexPath }, "Error sending index.html");
      res.status(500).send('Error serving frontend.');
    }
  });
});
// --- SPA Catch-all Route --- END

// Start server
app.listen(process.env.API_PORT as unknown as number, '0.0.0.0', async () => {
  console.log(`Server is running on port ${process.env.API_PORT}`);
  console.log(`Allowing CORS for: ${allowedOrigins.join(', ')}`);
  console.log(`API Documentation available at: http://localhost:${process.env.API_PORT}/api-docs`);

  // Start Discord Bot and then the background processor
  try {
    // Wait for the client to be ready (login happens in Discord.new)
    discord.getClient().once('ready', async () => {
      logger.info("Discord bot client is ready.");
      // Removed background processor startup
      // await processPendingRoleAssignments(); // Run once immediately on startup
      // setInterval(processPendingRoleAssignments, 60 * 1000);
      // logger.info("Started periodic check for pending role assignments (every 60 seconds).");
    });
    // Log that we are waiting for the ready event
    logger.info("Waiting for Discord bot client to signal ready...");

  } catch (error) {
    logger.error({ error }, "Failed to start Discord bot client.");
    // Decide if the server should exit or run without the bot
    // process.exit(1); 
  }
});

// Function to handle Discord interactions - Removed
// async function handleInteraction(interaction: Interaction<CacheType>) { ... }

// Handler for /passport verify command - Removed
// async function handlePassportVerify(interaction: CommandInteraction) { ... }

// Removed background processing function
// async function processPendingRoleAssignments() { ... }

 
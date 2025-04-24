import express from 'express';
import cors from 'cors';
import passportRoutes from './routes/passport-routes.js';
import { swaggerSpec, swaggerUi } from './swagger.js';
// import { dynamoDB } from "@sparta/utils"; // Unused
import { discord } from './discord/clients/discord.js';
import { logger } from '@sparta/utils';

// Define constants for session status (assuming these exist elsewhere or should be defined)
// const PENDING_ROLE_STATUS = 'pending_role_assignment'; // Removed local definition

const app = express();

// Enhanced CORS configuration
const allowedOrigins = [
  `${process.env.WEBAPP_HOST}:${process.env.WEBAPP_PORT}`,
  'http://localhost:5173',
];

// Debug middleware to log all requests
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url} | Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      console.log(`Allowing request with no origin`);
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`Allowing request from origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`Blocking request from disallowed origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }' // Hide the top bar (optional)
}));

// Serve the Swagger spec as JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api', passportRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

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

 
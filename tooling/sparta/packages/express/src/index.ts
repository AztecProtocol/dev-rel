import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
// import { dynamoDB } from "@sparta/utils"; // Unused
import { discord } from './domain/discord/clients/discord.js';
import { logger } from '@sparta/utils';
import path from 'path'; // Import path module
import { fileURLToPath } from 'url'; // Import fileURLToPath for ES modules
import { initializeUserRepository } from './db/userRepository.js';

import { readFileSync } from 'fs';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the User repository
initializeUserRepository();

// Define constants for session status (assuming these exist elsewhere or should be defined)
// const PENDING_ROLE_STATUS = 'pending_role_assignment'; // Removed local definition

let allowedOrigins: string[] = [];
const nodeEnv = process.env.NODE_ENV;

if (nodeEnv === 'development') {
  allowedOrigins = [
    'http://localhost:3000', // Allow Express itself if serving frontend
    'http://localhost:5173', // Default Vite dev port
    'http://192.168.100.9:3000' // Allow local IP address
  ];
}

logger.info({ nodeEnv, resolvedOrigins: allowedOrigins }, "Initializing CORS");

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

const app = express();

async function setupVite() {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {

   const { createServer } = await import('vite')

    // 1) spin up a Vite dev server in middleware mode
    const vite = await createServer({
      root: path.resolve(__dirname, '../../vite'),
      server: { 
        middlewareMode: true,
      },
      appType: 'custom',  // for middleware usage
      base: "/"
    });
    app.use(vite.middlewares);


    // only in dev, after mounting vite.middlewares:
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl.replace('/', '');

        // 1) load the Vite index.html template
        let template = readFileSync(
          path.resolve(__dirname, '../../vite/index.html'),
          'utf-8'
        );

        // 2) let Vite inject HMR client + transform e.g. <script type=module>…
        template = await vite.transformIndexHtml(url, template);

        // 3) load your SSR entry
        const { render } = await vite.ssrLoadModule(
          path.resolve(__dirname, '../../vite/src/main.tsx')
        );

        const rendered = await render(url)

        const html = template
          .replace(`<!--app-head-->`, rendered.head ?? '')
          .replace(`<!--app-html-->`, rendered.html ?? '')

        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

  } else {
    // your existing static‐serve for production
    const distDir = path.join(__dirname, '../../vite/dist');
    app.use('/', express.static(distDir, { index: false }));
    app.get('/*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }
}

await setupVite();



// Debug middleware to log all requests
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url} | Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Middleware
app.use(cors(corsOptions));
// API Routes
app.use('/api', apiRoutes);

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
    });
    // Log that we are waiting for the ready event
    logger.info("Waiting for Discord bot client to signal ready...");

  } catch (error) {
    logger.error({ error }, "Failed to start Discord bot client.");
    // Decide if the server should exit or run without the bot
    process.exit(1);
  }
});

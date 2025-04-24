import express from 'express';
import cors from 'cors';
import passportRoutes from './routes/passport-routes.js';

const app = express();

// Enhanced CORS configuration
const allowedOrigins = [
  `${process.env.WEBAPP_HOST}:${process.env.WEBAPP_PORT}`,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
];

// Debug middleware to log all requests
app.use((req, res, next) => {
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

// Routes
app.use('/api', passportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(process.env.API_PORT as unknown as number, '0.0.0.0', () => {
  console.log(`Server is running on port ${process.env.API_PORT}`);
  console.log(`Allowing CORS for: ${allowedOrigins.join(', ')}`);
}); 

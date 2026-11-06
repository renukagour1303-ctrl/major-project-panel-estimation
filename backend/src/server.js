import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/index.js';
import { getPublicPricing } from './controllers/settingsController.js';

// Resolve directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend or root .env if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
// CORS origin configuration - accepts wildcard, specific origins, or dynamic ngrok/localtunnel origins
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CORS_ORIGIN === '*') return callback(null, true);
    if (
      CORS_ORIGIN.split(',').map(o => o.trim()).includes(origin) ||
      origin.includes('ngrok-free.app') ||
      origin.includes('ngrok.io') ||
      origin.includes('localtunnel.me')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'bypass-tunnel-reminder'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for development
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Serve uploaded assets statically
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Direct public pricing endpoint for local & reverse-proxy routing
app.get('/api/settings/pricing', getPublicPricing);
app.get('/api/pricing', getPublicPricing);
app.get('/pricing', getPublicPricing);

// Mount base API routes
app.use('/api', apiRouter);

// Root route handler
app.get('/', (req, res) => {
  res.json({
    message: 'Sungroves Innovations LLP - Solar Calculator API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} does not exist.`
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
});

// Start listening explicitly on 0.0.0.0 to allow incoming tunnel/network traffic
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(` Sungroves Solar Calculator Backend API`);
  console.log(` Server running on: http://${HOST}:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[Server] Port ${PORT} is already active, reusing existing instance.`);
  } else {
    console.error('Server error:', err);
  }
});

if (process.env.npm_lifecycle_event === 'test' || process.env.NODE_ENV === 'test') {
  server.unref();
}

export { server };
export default app;

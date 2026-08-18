import { Router } from 'express';

const router = Router();

/**
 * GET /api/health
 * Basic health check endpoint to verify backend service status.
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Sungroves Solar Calculator Backend API',
    version: '1.0.0',
    chunk: 'Chunk 1: Project Setup',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;

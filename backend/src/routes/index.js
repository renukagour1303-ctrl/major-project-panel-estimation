import { Router } from 'express';
import healthRouter from './health.js';

const apiRouter = Router();

// Mount health check route
apiRouter.use('/health', healthRouter);

export default apiRouter;

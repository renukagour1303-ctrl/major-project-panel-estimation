import { Router } from 'express';
import healthRouter from './health.js';
import solarRouter from './solar.js';

const apiRouter = Router();

// Mount health check route
apiRouter.use('/health', healthRouter);

// Mount solar calculations route
apiRouter.use('/solar', solarRouter);

export default apiRouter;

import { Router } from 'express';
import healthRouter from './health.js';
import solarRouter from './solar.js';
import authRouter from './auth.js';
import configRouter from './config.js';
import leadsRouter from './leads.js';
import adminRouter from './admin.js';
import customerRouter from './customer.js';
import reviewsRouter from './reviews.js';
import settingsRouter from './settings.js';
import pricingRouter from './pricing.js';
import plansRouter from './plans.js';
import paymentsRouter from './payments.js';
import paymentRouter from './payment.js';

const apiRouter = Router();

// Mount health check route
apiRouter.use('/health', healthRouter);

// Mount solar calculations route
apiRouter.use('/solar', solarRouter);

// Mount authentication routes
apiRouter.use('/auth', authRouter);

// Mount company configuration & pricing routes
apiRouter.use('/config', configRouter);

// Mount dynamic site settings & contact sync routes
apiRouter.use('/settings', settingsRouter);

// Mount public pricing sync routes (/api/pricing)
apiRouter.use('/pricing', pricingRouter);

// Mount subscription plan configurator & feature lock routes
apiRouter.use('/plans', plansRouter);

// Mount Razorpay payment & upgrade routes (/payment and /payments)
apiRouter.use('/payment', paymentRouter);
apiRouter.use('/payments', paymentRouter);

// Mount leads / customer inquiries routes
apiRouter.use('/leads', leadsRouter);

// Mount admin & staff management routes
apiRouter.use('/admin', adminRouter);

// Mount customer authentication & account routes
apiRouter.use('/customer', customerRouter);

// Mount reviews routes
apiRouter.use('/reviews', reviewsRouter);

export default apiRouter;

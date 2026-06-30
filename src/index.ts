import express from 'express';
import { remittanceRoutes } from './routes/remittanceRoutes';
import { remittanceApiRoutes } from './routes/remittanceApiRoutes';
import { verificationRoutes } from './routes/verificationRoutes';
import { selfRoutes } from './routes/selfRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { adminReviewRoutes } from './controllers/adminReviewController';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

const app = express();

// Middleware
app.use(express.json());

// Rate limiting — general limiter on all API routes (1000/hr prod, 200/min dev)
app.use('/api', rateLimiter);

// Routes
app.use('/api/remittances', remittanceRoutes);
app.use('/api', remittanceApiRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/self', selfRoutes);
app.use('/api/admin', adminReviewRoutes);
app.use('/health', healthRoutes);

// Error handling
app.use(errorHandler);

export default app;
export { app };

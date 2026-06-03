import express from 'express';
import { remittanceRoutes } from './routes/remittanceRoutes';
import { verificationRoutes } from './routes/verificationRoutes';
import { selfRoutes } from './routes/selfRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/remittances', remittanceRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/self', selfRoutes);
app.use('/health', healthRoutes);

// Error handling
app.use(errorHandler);

export default app;
export { app };

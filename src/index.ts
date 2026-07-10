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

// Middleware — capture the raw body so webhook signature verification (Svix) works.
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

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

// Bootstrap the HTTP server when run directly (node dist/index.js).
// Skipped when imported by tests / programmatic consumers.
if (require.main === module) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Email Remittance Pro API listening on http://${HOST}:${PORT}`);
  });
}

export default app;
export { app };

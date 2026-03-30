import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { transactionRoutes } from './controllers/transactionController';
import { verificationRoutes } from './controllers/verificationController';
import { webhookRoutes } from './controllers/webhookController';
import { emailRoutes } from './controllers/emailController';
import { celoRoutes } from './controllers/celoController';
import { healthRoutes } from './controllers/healthController';
import { logger } from './utils/logger';
import { database } from './db/database';

// Load environment variables
dotenv.config();

// Initialize database
database;

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "https:"],
      connectSrc: ["'self'", "https://api.self.xyz", "https://api.ampersend.io"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Serve static public assets
import path from 'path';
app.use(express.static(path.join(__dirname, '../public')));

// Claim UI — /claim/:token → serve claim.html (SPA-style)
app.get('/claim/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/claim.html'));
});

// Health check endpoint (public)
app.use('/health', healthRoutes);

// ERC-8004 Agent Card — Monad Identity Registry token #8368
app.get('/.well-known/agent-card.json', (_req, res) => {
  res.json({
    name: 'Titan — Email Remittance Agent',
    version: '1.0.0',
    description: 'Autonomous agent that sends crypto to anyone via email. No wallet required to receive. Deployed on Celo, Base, and Monad.',
    agentId: 'titan-8368',
    erc8004: {
      chain: 'monad',
      chainId: 143,
      contractAddress: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      tokenId: 8368,
      registrationTx: '0x4317aed38248d4a878f47282093a6adfffd864205aa5716990efef380e3d99ac',
      explorerUrl: 'https://monadvision.com/tx/0x4317aed38248d4a878f47282093a6adfffd864205aa5716990efef380e3d99ac',
    },
    operatorWallet: '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A',
    operatorEns: 'drdeeks.base.eth',
    endpoints: {
      a2a: 'https://email-remittance-pro.up.railway.app/api',
      health: 'https://email-remittance-pro.up.railway.app/health',
    },
    capabilities: {
      tools: ['email-remittance', 'zk-identity-verification', 'multi-chain-transfers', 'auto-wallet-generation'],
      chains: ['celo', 'base', 'monad'],
      models: ['venice-uncensored'],
    },
    taskCategories: ['crypto-remittance', 'email-native-payments', 'zk-identity', 'multi-chain-defi'],
    x402PaymentAddress: '0x9D65433B3FE597C15a46D2365F8F2c1701Eb9e4A',
    links: {
      frontend: 'https://email-remittance-pro.vercel.app',
      farcaster: 'https://warpcast.com/titan-agent',
      moltbook: 'https://moltbook.com/@titan_192',
    },
  });
});

// Public API routes
app.use('/api/remittance', transactionRoutes);
app.use('/api/transactions', transactionRoutes); // Alias for backwards compat
app.use('/api/verifications', verificationRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/celo', celoRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Email-Crypto Remittance API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 60 * 1000, // 1 hour in prod, 1 min in dev
  limit: process.env.NODE_ENV === 'production' ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req: Request) => {
    return req.path.startsWith('/health') || req.path.startsWith('/api/webhooks');
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: 60,
    });
  },
});

// Sensitive endpoint rate limiter
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  message: { error: 'Too many attempts, please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Transaction creation rate limiter
export const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    return req.body?.recipientEmail || req.ip || 'unknown';
  },
  message: { error: 'Too many transaction attempts, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email verification rate limiter
export const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  keyGenerator: (req: Request) => req.body?.email || req.ip || 'unknown',
  message: { error: 'Too many verification attempts for this email.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook rate limiter
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

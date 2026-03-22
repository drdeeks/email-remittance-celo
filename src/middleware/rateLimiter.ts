import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorCodes, ErrorCategory, ErrorSeverity } from '../utils/errors';

/**
 * Enterprise Rate Limiting Middleware
 * Follows security_measures.json
 * - Tiered rate limits
 * - Endpoint-specific limits
 * - IP-based and user-based limiting
 * - Structured error responses
 */

// Rate limit response format
interface RateLimitResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
    statusCode: number;
    category: string;
    severity: string;
    retryable: boolean;
    retryAfter: number;
    userActions: string[];
  };
}

// Create structured rate limit response
function createRateLimitResponse(retryAfterSeconds: number): RateLimitResponse {
  return {
    error: {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests, please try again later',
      timestamp: new Date().toISOString(),
      statusCode: 429,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.LOW,
      retryable: true,
      retryAfter: retryAfterSeconds,
      userActions: [`Wait ${retryAfterSeconds} seconds before retrying`],
    },
  };
}

// Rate limit handler
function createRateLimitHandler(limitType: string) {
  return (req: Request, res: Response): void => {
    const retryAfter = Math.ceil((res.getHeader('Retry-After') as number) || 60);

    logger.warn('Rate limit exceeded', {
      type: limitType,
      ip: req.ip || req.socket?.remoteAddress,
      path: req.originalUrl,
      method: req.method,
      retryAfter,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    });

    res.status(429).json(createRateLimitResponse(retryAfter));
  };
}

// Key generator that combines IP and user ID
function createKeyGenerator(includeUserId = false) {
  return (req: Request): string => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (includeUserId) {
      const userId = (req as Record<string, unknown>).user?.['userId'] as string | undefined;
      return userId ? `${ip}:${userId}` : ip;
    }
    return ip;
  };
}

// Skip function for health and metrics endpoints
const skipHealthEndpoints = (req: Request): boolean => {
  const skipPaths = ['/health', '/health/live', '/health/ready', '/metrics'];
  return skipPaths.some(path => req.path.startsWith(path));
};

// General API rate limiter
export const rateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 60 * 1000, // 1 hour prod, 1 min dev
  limit: process.env.NODE_ENV === 'production' ? 1000 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => skipHealthEndpoints(req) || req.path.startsWith('/api/webhooks'),
  keyGenerator: createKeyGenerator(false),
  handler: createRateLimitHandler('general'),
});

// Strict rate limiter for sensitive endpoints
export const sensitiveLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: createKeyGenerator(true),
  handler: createRateLimitHandler('sensitive'),
});

// Transaction creation rate limiter
export const transactionLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req: Request): string => {
    // Rate limit by sender email or IP
    const senderEmail = req.body?.senderEmail as string | undefined;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return senderEmail ? `tx:${senderEmail.toLowerCase()}` : `tx:${ip}`;
  },
  handler: createRateLimitHandler('transaction'),
});

// Email verification rate limiter
export const verifyEmailLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const email = req.body?.email as string | undefined;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return email ? `verify:${email.toLowerCase()}` : `verify:${ip}`;
  },
  handler: createRateLimitHandler('email-verification'),
});

// Webhook rate limiter (higher limits for trusted sources)
export const webhookLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use webhook signature or source identifier if available
    const webhookId = req.headers['x-webhook-id'] as string | undefined;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return webhookId ? `webhook:${webhookId}` : `webhook:${ip}`;
  },
  handler: createRateLimitHandler('webhook'),
});

// Login/Auth rate limiter - very strict
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request): string => {
    const email = req.body?.email as string | undefined;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return email ? `auth:${email.toLowerCase()}` : `auth:${ip}`;
  },
  handler: (req: Request, res: Response): void => {
    const retryAfter = Math.ceil((res.getHeader('Retry-After') as number) || 900);

    logger.warn('Auth rate limit exceeded - possible brute force attempt', {
      ip: req.ip || req.socket?.remoteAddress,
      email: req.body?.email?.substring(0, 3) + '***',
      retryAfter,
    });

    res.status(429).json({
      error: {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'Too many authentication attempts',
        timestamp: new Date().toISOString(),
        statusCode: 429,
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        retryAfter,
        userActions: [
          'Wait 15 minutes before trying again',
          'Reset your password if you forgot it',
          'Contact support if you believe this is an error',
        ],
      },
    });
  },
});

// Burst protection - very short window, low limit
export const burstLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1000, // 1 second
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipHealthEndpoints,
  keyGenerator: createKeyGenerator(false),
  handler: (req: Request, res: Response): void => {
    logger.warn('Burst rate limit exceeded - possible DoS attempt', {
      ip: req.ip || req.socket?.remoteAddress,
      path: req.originalUrl,
    });

    res.status(429).json(createRateLimitResponse(1));
  },
});

// Claim endpoint rate limiter
export const claimLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const transactionId = req.params?.id;
    return transactionId ? `claim:${transactionId}` : `claim:${ip}`;
  },
  handler: createRateLimitHandler('claim'),
});

// Transfer endpoint rate limiter - strict for financial operations
export const transferLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: createKeyGenerator(true),
  handler: (req: Request, res: Response): void => {
    const retryAfter = Math.ceil((res.getHeader('Retry-After') as number) || 60);

    logger.warn('Transfer rate limit exceeded', {
      ip: req.ip || req.socket?.remoteAddress,
      userId: (req as Record<string, unknown>).user?.['userId'],
      retryAfter,
    });

    res.status(429).json({
      error: {
        code: ErrorCodes.RATE_LIMIT_TRANSACTION,
        message: 'Too many transfer requests',
        timestamp: new Date().toISOString(),
        statusCode: 429,
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        retryAfter,
        userActions: [
          `Wait ${retryAfter} seconds before initiating another transfer`,
          'Contact support for increased limits',
        ],
      },
    });
  },
});

// Dynamic rate limiter that can be adjusted at runtime
export class DynamicRateLimiter {
  private currentLimit: number;
  private windowMs: number;
  private limiter: RateLimitRequestHandler;

  constructor(initialLimit: number, windowMs: number, name: string) {
    this.currentLimit = initialLimit;
    this.windowMs = windowMs;
    this.limiter = this.createLimiter(name);
  }

  private createLimiter(name: string): RateLimitRequestHandler {
    return rateLimit({
      windowMs: this.windowMs,
      limit: this.currentLimit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      keyGenerator: createKeyGenerator(false),
      handler: createRateLimitHandler(name),
    });
  }

  getMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      this.limiter(req, res, next);
    };
  }

  setLimit(newLimit: number): void {
    this.currentLimit = newLimit;
    logger.info('Rate limit adjusted', { newLimit });
  }

  getLimit(): number {
    return this.currentLimit;
  }
}

// Export default combined middleware
export default function applyRateLimiting(app: { use: (path: string | unknown, ...handlers: unknown[]) => void }): void {
  // Apply burst protection globally
  app.use(burstLimiter);

  // Apply general rate limiting
  app.use(rateLimiter);

  // Apply specific limiters to routes
  app.use('/api/transactions', transactionLimiter);
  app.use('/api/transactions/:id/claim', claimLimiter);
  app.use('/api/celo/transfer', transferLimiter);
  app.use('/api/verifications', verifyEmailLimiter);
  app.use('/api/webhooks', webhookLimiter);
  app.use('/api/auth', authLimiter);
}

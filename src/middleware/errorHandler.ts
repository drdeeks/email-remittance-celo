import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestError, ErrorSeverity, ErrorCodes, ErrorCategory, sanitizeErrorForLogging } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Enterprise Error Handler Middleware
 * Follows error_handling_standards.json
 * - Structured error responses
 * - Correlation IDs for tracking
 * - Severity-based logging
 * - Sensitive data protection
 */

// Sensitive fields to redact from logs
const SENSITIVE_FIELDS = [
  'password', 'apiKey', 'apiSecret', 'privateKey', 'secret',
  'token', 'accessToken', 'refreshToken', 'authorization',
  'creditCard', 'cardNumber', 'cvv', 'ssn', 'socialSecurity',
];

// Redact sensitive data from objects
function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

// Mask email for logging
function maskEmail(email: string | undefined): string {
  if (!email) return 'unknown';
  const [local, domain] = email.split('@');
  if (!domain) return email.slice(0, 2) + '***';
  return local.slice(0, 2) + '***@' + domain;
}

export interface EnhancedRequest extends Request {
  correlationId?: string;
  user?: {
    userId?: string;
    email?: string;
    type?: string;
  };
}

export const correlationMiddleware = (req: EnhancedRequest, res: Response, next: NextFunction): void => {
  // Get correlation ID from header or generate new one
  req.correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  // Set correlation ID in response header
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
};

export const errorHandler = (
  err: Error | RequestError,
  req: EnhancedRequest,
  res: Response,
  _next: NextFunction
): Response => {
  const correlationId = req.correlationId || uuidv4();
  const timestamp = new Date().toISOString();

  // Build log context
  const logContext = {
    correlationId,
    timestamp,
    endpoint: req.originalUrl,
    method: req.method,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    userId: req.user?.userId,
    userEmail: req.user?.email ? maskEmail(req.user.email) : undefined,
    body: redactSensitiveData(req.body as Record<string, unknown>),
    query: redactSensitiveData(req.query as Record<string, unknown>),
  };

  // Handle known RequestError
  if (err instanceof RequestError) {
    // Log based on severity
    const errorLog = {
      ...logContext,
      error: sanitizeErrorForLogging(err),
      severity: err.severity,
      category: err.category,
      code: err.code,
    };

    switch (err.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('CRITICAL ERROR', errorLog);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error', errorLog);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error', errorLog);
        break;
      default:
        logger.info('Request error', errorLog);
    }

    // Return structured error response
    return res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.message,
        timestamp,
        requestId: err.requestId,
        correlationId,
        path: req.originalUrl,
        method: req.method,
        statusCode: err.httpStatus,
        category: err.category,
        severity: err.severity,
        retryable: err.retryable,
        userActions: err.userActions.length > 0 ? err.userActions : undefined,
      },
    });
  }

  // Handle validation errors from external libraries (express-validator, etc.)
  if (err.name === 'ValidationError') {
    logger.warn('Validation error', {
      ...logContext,
      error: sanitizeErrorForLogging(err),
    });

    return res.status(400).json({
      error: {
        code: ErrorCodes.VAL_INVALID_FORMAT,
        message: err.message,
        timestamp,
        correlationId,
        path: req.originalUrl,
        method: req.method,
        statusCode: 400,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
      },
    });
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('Invalid JSON in request body', {
      ...logContext,
      error: { message: err.message },
    });

    return res.status(400).json({
      error: {
        code: ErrorCodes.VAL_INVALID_FORMAT,
        message: 'Invalid JSON in request body',
        timestamp,
        correlationId,
        path: req.originalUrl,
        method: req.method,
        statusCode: 400,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        userActions: ['Check request body is valid JSON'],
      },
    });
  }

  // Handle unknown/unhandled errors
  logger.error('Unhandled error', {
    ...logContext,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    },
  });

  // Production: hide internal error details
  const isProduction = process.env.NODE_ENV === 'production';

  return res.status(500).json({
    error: {
      code: ErrorCodes.SYS_INTERNAL_ERROR,
      message: isProduction ? 'An unexpected error occurred' : err.message,
      timestamp,
      correlationId,
      path: req.originalUrl,
      method: req.method,
      statusCode: 500,
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      retryable: false,
      userActions: ['Please try again or contact support'],
    },
  });
};

// Not found handler
export const notFoundHandler = (req: EnhancedRequest, res: Response): Response => {
  const correlationId = req.correlationId || uuidv4();

  logger.info('Endpoint not found', {
    correlationId,
    endpoint: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  return res.status(404).json({
    error: {
      code: ErrorCodes.BIZ_TRANSACTION_NOT_FOUND,
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
      correlationId,
      path: req.originalUrl,
      method: req.method,
      statusCode: 404,
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.LOW,
      retryable: false,
      userActions: ['Check API documentation for available endpoints'],
    },
  });
};

// Graceful shutdown handler
export const gracefulShutdownHandler = (signal: string): void => {
  logger.info(`${signal} received, initiating graceful shutdown`, {
    signal,
    timestamp: new Date().toISOString(),
  });

  // Allow time for in-flight requests to complete
  setTimeout(() => {
    logger.info('Graceful shutdown complete');
    process.exit(0);
  }, 5000);
};

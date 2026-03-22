import { Request, Response, NextFunction } from 'express';
import { RequestError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const log = logger.child({ middleware: 'errorHandler' });

  // Log the error
  if (err instanceof RequestError) {
    log.warn(err.message, {
      error: err.message,
      type: err.type,
      stack: err.stack,
      endpoint: req.originalUrl,
      method: req.method,
    });
  } else {
    log.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      endpoint: req.originalUrl,
      method: req.method,
    });
  }

  // Determine response
  if (err instanceof RequestError) {
    return res.status(err.httpStatus).json({
      error: err.message,
      type: err.type,
      timestamp: new Date().toISOString(),
    });
  }

  // Default error response
  return res.status(500).json({
    error: 'Internal server error',
    type: 'internal_error',
    timestamp: new Date().toISOString(),
  });
};
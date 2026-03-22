import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface JWTPayload {
  userId?: string;
  email?: string;
  type?: 'user' | 'admin' | 'service';
  iat?: number;
  exp?: number;
}

class AuthenticationError extends Error {
  public httpStatus: number = 401;
  public type: string = 'authentication_error';
  
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends Error {
  public httpStatus: number = 403;
  public type: string = 'authorization_error';
  
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No valid token provided');
    }

    const token = authHeader.substring(7);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AuthenticationError('Authentication configuration missing on server');
    }

    const payload = jwt.verify(token, jwtSecret) as JWTPayload;

    // Attach user info to request
    (req as any).user = payload;
    next();
  } catch (error: any) {
    logger.warn('Authentication failed', { error: error.message });
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        type: 'authentication_error',
        timestamp: new Date().toISOString(),
      });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        type: 'authentication_error',
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(401).json({
      error: error.message || 'Authentication failed',
      type: 'authentication_error',
      timestamp: new Date().toISOString(),
    });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const payload = jwt.verify(token, jwtSecret) as JWTPayload;
        (req as any).user = payload;
      }
    }
  } catch (error: any) {
    // Optional auth - just log and continue
    logger.debug('Optional auth failed', { error: error.message });
  }
  next();
};

// Permission checking middleware
export const requirePermission = (permission: 'admin' | 'transaction:create' | 'transaction:read') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        type: 'authentication_error',
        timestamp: new Date().toISOString(),
      });
    }

    // Simple role-based access control
    if (user.type === 'admin') {
      return next();
    }

    if (permission === 'transaction:create' && (user.type === 'user' || user.type === 'admin')) {
      return next();
    }

    if (permission === 'transaction:read' && user.type === 'admin') {
      return next();
    }

    return res.status(403).json({
      error: 'Insufficient permissions',
      type: 'authorization_error',
      timestamp: new Date().toISOString(),
    });
  };
};

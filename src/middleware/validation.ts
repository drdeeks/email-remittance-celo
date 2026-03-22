import { Request, Response, NextFunction } from 'express';
import { validationError, ErrorCodes } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Enterprise Input Validation Middleware
 * Follows security_measures.json
 * - Server-side validation
 * - Type checking
 * - Sanitization
 * - Whitelist approach
 */

// Dangerous patterns to block
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
  /(--)|(\/\*)|(\*\/)/,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))/i,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$]|\$\(/,
  /\b(eval|exec|system|spawn)\b/i,
];

// Sanitization functions
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return String(input);
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeAddress(address: string): string {
  return address.toLowerCase().trim();
}

// Validation result type
interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  error?: string;
}

// Check for injection attempts
function checkInjection(value: string): ValidationResult {
  // Check SQL injection
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      logger.warn('SQL injection attempt detected', { value: value.substring(0, 100) });
      return { valid: false, error: 'Invalid characters detected in input' };
    }
  }

  // Check XSS
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      logger.warn('XSS attempt detected', { value: value.substring(0, 100) });
      return { valid: false, error: 'Invalid content detected in input' };
    }
  }

  // Check command injection
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      logger.warn('Command injection attempt detected', { value: value.substring(0, 100) });
      return { valid: false, error: 'Invalid characters detected in input' };
    }
  }

  return { valid: true, sanitized: sanitizeString(value) };
}

// Deep sanitize request body
function sanitizeRequestBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeRequestBody(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Generic validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check request body for injection attempts
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          const result = checkInjection(value);
          if (!result.valid) {
            throw validationError(
              `Invalid input in field '${key}'`,
              ErrorCodes.VAL_INVALID_FORMAT
            );
          }
        }
      }
    }

    // Check query params
    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          const result = checkInjection(value);
          if (!result.valid) {
            throw validationError(
              `Invalid input in query parameter '${key}'`,
              ErrorCodes.VAL_INVALID_FORMAT
            );
          }
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Email validation schema
export interface EmailValidationOptions {
  allowDisposable?: boolean;
  allowSubaddressing?: boolean;
  maxLength?: number;
}

const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com',
  'mailinator.com', 'temp-mail.org', 'fakeinbox.com', 'getnada.com',
  'yopmail.com', 'sharklasers.com', 'trashmail.com', 'maildrop.cc',
];

export function validateEmailInput(
  email: string,
  options: EmailValidationOptions = {}
): ValidationResult {
  const {
    allowDisposable = false,
    allowSubaddressing = true,
    maxLength = 254,
  } = options;

  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const sanitized = sanitizeEmail(email);

  // Length check
  if (sanitized.length > maxLength) {
    return { valid: false, error: `Email exceeds maximum length of ${maxLength}` };
  }

  // Format check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Check for subaddressing (+ in local part)
  if (!allowSubaddressing && sanitized.includes('+')) {
    return { valid: false, error: 'Email subaddressing is not allowed' };
  }

  // Check for disposable domains
  if (!allowDisposable) {
    const domain = sanitized.split('@')[1];
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return { valid: false, error: 'Disposable email addresses are not allowed' };
    }
  }

  return { valid: true, sanitized };
}

// Transaction validation
export interface TransactionValidation {
  senderEmail: string;
  recipientEmail: string;
  amount: number;
  currency?: string;
}

export function validateTransactionInput(data: TransactionValidation): void {
  // Validate sender email
  const senderResult = validateEmailInput(data.senderEmail, { allowDisposable: false });
  if (!senderResult.valid) {
    throw validationError(`Sender email: ${senderResult.error}`, ErrorCodes.VAL_INVALID_EMAIL);
  }

  // Validate recipient email
  const recipientResult = validateEmailInput(data.recipientEmail, { allowDisposable: false });
  if (!recipientResult.valid) {
    throw validationError(`Recipient email: ${recipientResult.error}`, ErrorCodes.VAL_INVALID_EMAIL);
  }

  // Sender and recipient must be different
  if (data.senderEmail.toLowerCase() === data.recipientEmail.toLowerCase()) {
    throw validationError(
      'Sender and recipient cannot be the same',
      ErrorCodes.BIZ_DUPLICATE_TRANSACTION,
      { userActions: ['Use different email addresses for sender and recipient'] }
    );
  }

  // Validate amount
  if (typeof data.amount !== 'number' || isNaN(data.amount)) {
    throw validationError('Amount must be a valid number', ErrorCodes.VAL_INVALID_AMOUNT);
  }

  if (data.amount <= 0) {
    throw validationError('Amount must be greater than 0', ErrorCodes.VAL_INVALID_AMOUNT);
  }

  if (data.amount > 1_000_000) {
    throw validationError(
      'Amount exceeds maximum limit of 1,000,000',
      ErrorCodes.VAL_INVALID_AMOUNT,
      { userActions: ['Contact support for large transactions'] }
    );
  }

  // Validate precision (max 2 decimal places for fiat-like amounts)
  const decimalPlaces = (data.amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 18) {
    throw validationError(
      'Amount has too many decimal places',
      ErrorCodes.VAL_INVALID_AMOUNT
    );
  }

  // Validate currency
  if (data.currency) {
    const validCurrencies = ['cUSD', 'cREAL', 'CELO'];
    if (!validCurrencies.includes(data.currency)) {
      throw validationError(
        `Invalid currency. Supported: ${validCurrencies.join(', ')}`,
        ErrorCodes.VAL_INVALID_CURRENCY
      );
    }
  }
}

// Celo address validation
export function validateCeloAddressInput(address: string): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }

  const sanitized = sanitizeAddress(address);

  // Check format
  if (!sanitized.startsWith('0x')) {
    return { valid: false, error: 'Address must start with 0x' };
  }

  if (sanitized.length !== 42) {
    return { valid: false, error: 'Address must be 42 characters' };
  }

  // Check hex characters
  if (!/^0x[a-f0-9]{40}$/.test(sanitized)) {
    return { valid: false, error: 'Address contains invalid characters' };
  }

  // Check for zero address
  if (sanitized === '0x0000000000000000000000000000000000000000') {
    return { valid: false, error: 'Zero address is not allowed' };
  }

  return { valid: true, sanitized };
}

// Transaction hash validation
export function validateTxHashInput(txHash: string): ValidationResult {
  if (!txHash || typeof txHash !== 'string') {
    return { valid: false, error: 'Transaction hash is required' };
  }

  const sanitized = txHash.toLowerCase().trim();

  if (!sanitized.startsWith('0x')) {
    return { valid: false, error: 'Transaction hash must start with 0x' };
  }

  if (sanitized.length !== 66) {
    return { valid: false, error: 'Transaction hash must be 66 characters' };
  }

  if (!/^0x[a-f0-9]{64}$/.test(sanitized)) {
    return { valid: false, error: 'Transaction hash contains invalid characters' };
  }

  return { valid: true, sanitized };
}

// UUID validation
export function validateUUID(uuid: string): ValidationResult {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: 'ID is required' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: 'Invalid ID format' };
  }

  return { valid: true, sanitized: uuid.toLowerCase() };
}

// Pagination validation
export interface PaginationOptions {
  maxLimit?: number;
  defaultLimit?: number;
}

export function validatePagination(
  limit: string | undefined,
  offset: string | undefined,
  options: PaginationOptions = {}
): { limit: number; offset: number } {
  const { maxLimit = 100, defaultLimit = 10 } = options;

  let parsedLimit = defaultLimit;
  let parsedOffset = 0;

  if (limit !== undefined) {
    parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw validationError('Limit must be a positive integer', ErrorCodes.VAL_INVALID_FORMAT);
    }
    if (parsedLimit > maxLimit) {
      parsedLimit = maxLimit;
    }
  }

  if (offset !== undefined) {
    parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      throw validationError('Offset must be a non-negative integer', ErrorCodes.VAL_INVALID_FORMAT);
    }
  }

  return { limit: parsedLimit, offset: parsedOffset };
}

// Content type validation middleware
export const requireJsonContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      throw validationError(
        'Content-Type must be application/json',
        ErrorCodes.VAL_INVALID_FORMAT,
        { userActions: ['Set Content-Type header to application/json'] }
      );
    }
  }
  next();
};

// Request size validation middleware
export const validateRequestSize = (maxSizeBytes: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxSizeBytes) {
      throw validationError(
        `Request body exceeds maximum size of ${maxSizeBytes / 1024 / 1024}MB`,
        ErrorCodes.VAL_INVALID_FORMAT
      );
    }
    next();
  };
};

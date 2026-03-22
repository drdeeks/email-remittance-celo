import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Error Handling System
 * Follows error_handling_standards.json
 */

// Error severity levels
export enum ErrorSeverity {
  CRITICAL = 'CRITICAL',  // System-breaking errors
  HIGH = 'HIGH',          // Feature-breaking errors
  MEDIUM = 'MEDIUM',      // Non-critical errors
  LOW = 'LOW',            // Minor issues
  INFO = 'INFO',          // Warnings
}

// Error categories with code ranges
export enum ErrorCategory {
  AUTHENTICATION = 'AUTH',
  AUTHORIZATION = 'AUTHZ',
  VALIDATION = 'VAL',
  BUSINESS_LOGIC = 'BIZ',
  DATABASE = 'DB',
  EXTERNAL_SERVICE = 'EXT',
  SYSTEM = 'SYS',
  RATE_LIMIT = 'RATE',
}

// Error type enum
export enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  NOT_FOUND_ERROR = 'not_found_error',
  BUSINESS_LOGIC_ERROR = 'business_logic_error',
  EXTERNAL_API_ERROR = 'external_api_error',
  DATABASE_ERROR = 'database_error',
  INTERNAL_ERROR = 'internal_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  CELO_ERROR = 'celo_error',
  SELF_VERIFICATION_ERROR = 'self_verification_error',
}

// Structured error codes
export const ErrorCodes = {
  // Authentication errors (AUTH_001 - AUTH_099)
  AUTH_MISSING_TOKEN: 'AUTH_001',
  AUTH_INVALID_TOKEN: 'AUTH_002',
  AUTH_EXPIRED_TOKEN: 'AUTH_003',
  AUTH_INVALID_CREDENTIALS: 'AUTH_004',
  AUTH_CONFIG_MISSING: 'AUTH_005',
  
  // Authorization errors (AUTHZ_001 - AUTHZ_099)
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ_001',
  AUTHZ_RESOURCE_FORBIDDEN: 'AUTHZ_002',
  
  // Validation errors (VAL_001 - VAL_099)
  VAL_MISSING_FIELD: 'VAL_001',
  VAL_INVALID_EMAIL: 'VAL_002',
  VAL_INVALID_AMOUNT: 'VAL_003',
  VAL_INVALID_CURRENCY: 'VAL_004',
  VAL_INVALID_ADDRESS: 'VAL_005',
  VAL_INVALID_TX_HASH: 'VAL_006',
  VAL_INVALID_FORMAT: 'VAL_007',
  
  // Business logic errors (BIZ_001 - BIZ_099)
  BIZ_TRANSACTION_NOT_FOUND: 'BIZ_001',
  BIZ_TRANSACTION_EXPIRED: 'BIZ_002',
  BIZ_TRANSACTION_INVALID_STATUS: 'BIZ_003',
  BIZ_VERIFICATION_NOT_FOUND: 'BIZ_004',
  BIZ_VERIFICATION_FAILED: 'BIZ_005',
  BIZ_INSUFFICIENT_FUNDS: 'BIZ_006',
  BIZ_DUPLICATE_TRANSACTION: 'BIZ_007',
  BIZ_DISPOSABLE_EMAIL: 'BIZ_008',
  
  // External service errors (EXT_001 - EXT_099)
  EXT_CELO_CONNECTION_FAILED: 'EXT_001',
  EXT_CELO_TRANSFER_FAILED: 'EXT_002',
  EXT_CELO_BALANCE_FAILED: 'EXT_003',
  EXT_SELF_VERIFICATION_FAILED: 'EXT_004',
  EXT_SELF_CONNECTION_FAILED: 'EXT_005',
  EXT_EMAIL_SEND_FAILED: 'EXT_006',
  EXT_AMPERSEND_ERROR: 'EXT_007',
  
  // Database errors (DB_001 - DB_099)
  DB_CONNECTION_FAILED: 'DB_001',
  DB_QUERY_FAILED: 'DB_002',
  DB_TRANSACTION_FAILED: 'DB_003',
  
  // System errors (SYS_001 - SYS_099)
  SYS_INTERNAL_ERROR: 'SYS_001',
  SYS_SERVICE_UNAVAILABLE: 'SYS_002',
  SYS_CONFIG_ERROR: 'SYS_003',
  SYS_NOT_IMPLEMENTED: 'SYS_004',
  
  // Rate limit errors (RATE_001 - RATE_099)
  RATE_LIMIT_EXCEEDED: 'RATE_001',
  RATE_LIMIT_TRANSACTION: 'RATE_002',
  RATE_LIMIT_VERIFICATION: 'RATE_003',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Structured error response interface
export interface StructuredErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: string;
    timestamp: string;
    requestId: string;
    path?: string;
    method?: string;
    statusCode: number;
    category: ErrorCategory;
    severity: ErrorSeverity;
    retryable: boolean;
    userActions?: string[];
  };
}

// Enterprise-grade request error class
export class RequestError extends Error {
  public readonly requestId: string;
  public readonly timestamp: string;
  public readonly retryable: boolean;
  public readonly userActions: string[];

  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly type: ErrorType,
    public readonly code: ErrorCode,
    public readonly category: ErrorCategory,
    public readonly severity: ErrorSeverity,
    options?: {
      details?: Record<string, unknown>;
      retryable?: boolean;
      userActions?: string[];
    }
  ) {
    super(message);
    this.name = 'RequestError';
    this.requestId = uuidv4();
    this.timestamp = new Date().toISOString();
    this.retryable = options?.retryable ?? false;
    this.userActions = options?.userActions ?? [];
  }

  toJSON(): StructuredErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        timestamp: this.timestamp,
        requestId: this.requestId,
        statusCode: this.httpStatus,
        category: this.category,
        severity: this.severity,
        retryable: this.retryable,
        userActions: this.userActions.length > 0 ? this.userActions : undefined,
      },
    };
  }
}

// Error factory functions with full enterprise metadata

export const validationError = (
  message: string,
  code: ErrorCode = ErrorCodes.VAL_INVALID_FORMAT,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    400,
    ErrorType.VALIDATION_ERROR,
    code,
    ErrorCategory.VALIDATION,
    ErrorSeverity.LOW,
    { ...options, retryable: false }
  );

export const authenticationError = (
  message: string,
  code: ErrorCode = ErrorCodes.AUTH_INVALID_TOKEN,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    401,
    ErrorType.AUTHENTICATION_ERROR,
    code,
    ErrorCategory.AUTHENTICATION,
    ErrorSeverity.MEDIUM,
    { ...options, retryable: false, userActions: options?.userActions ?? ['Please login again'] }
  );

export const authorizationError = (
  message: string,
  code: ErrorCode = ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    403,
    ErrorType.AUTHORIZATION_ERROR,
    code,
    ErrorCategory.AUTHORIZATION,
    ErrorSeverity.MEDIUM,
    { ...options, retryable: false, userActions: options?.userActions ?? ['Contact administrator'] }
  );

export const notFoundError = (
  message: string,
  code: ErrorCode = ErrorCodes.BIZ_TRANSACTION_NOT_FOUND,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    404,
    ErrorType.NOT_FOUND_ERROR,
    code,
    ErrorCategory.BUSINESS_LOGIC,
    ErrorSeverity.LOW,
    { ...options, retryable: false }
  );

export const businessLogicError = (
  message: string,
  code: ErrorCode = ErrorCodes.BIZ_TRANSACTION_INVALID_STATUS,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    422,
    ErrorType.BUSINESS_LOGIC_ERROR,
    code,
    ErrorCategory.BUSINESS_LOGIC,
    ErrorSeverity.MEDIUM,
    { ...options, retryable: false }
  );

export const externalAPIError = (
  message: string,
  code: ErrorCode = ErrorCodes.EXT_CELO_CONNECTION_FAILED,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    502,
    ErrorType.EXTERNAL_API_ERROR,
    code,
    ErrorCategory.EXTERNAL_SERVICE,
    ErrorSeverity.HIGH,
    { ...options, retryable: true, userActions: options?.userActions ?? ['Try again later'] }
  );

export const celoError = (
  message: string,
  code: ErrorCode = ErrorCodes.EXT_CELO_TRANSFER_FAILED,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    502,
    ErrorType.CELO_ERROR,
    code,
    ErrorCategory.EXTERNAL_SERVICE,
    ErrorSeverity.HIGH,
    { ...options, retryable: true, userActions: options?.userActions ?? ['Check transaction status on Celo explorer'] }
  );

export const selfVerificationError = (
  message: string,
  code: ErrorCode = ErrorCodes.EXT_SELF_VERIFICATION_FAILED,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    502,
    ErrorType.SELF_VERIFICATION_ERROR,
    code,
    ErrorCategory.EXTERNAL_SERVICE,
    ErrorSeverity.HIGH,
    { ...options, retryable: true, userActions: options?.userActions ?? ['Try verification again'] }
  );

export const databaseError = (
  message: string,
  code: ErrorCode = ErrorCodes.DB_QUERY_FAILED,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    500,
    ErrorType.DATABASE_ERROR,
    code,
    ErrorCategory.DATABASE,
    ErrorSeverity.CRITICAL,
    { ...options, retryable: true, userActions: options?.userActions ?? ['Try again later'] }
  );

export const rateLimitError = (
  message: string,
  code: ErrorCode = ErrorCodes.RATE_LIMIT_EXCEEDED,
  options?: { details?: Record<string, unknown>; retryAfterSeconds?: number }
): RequestError =>
  new RequestError(
    message,
    429,
    ErrorType.RATE_LIMIT_ERROR,
    code,
    ErrorCategory.RATE_LIMIT,
    ErrorSeverity.LOW,
    {
      ...options,
      retryable: true,
      userActions: [`Wait ${options?.retryAfterSeconds ?? 60} seconds and try again`],
    }
  );

export const internalError = (
  message: string,
  code: ErrorCode = ErrorCodes.SYS_INTERNAL_ERROR,
  options?: { details?: Record<string, unknown>; userActions?: string[] }
): RequestError =>
  new RequestError(
    message,
    500,
    ErrorType.INTERNAL_ERROR,
    code,
    ErrorCategory.SYSTEM,
    ErrorSeverity.CRITICAL,
    { ...options, retryable: false, userActions: options?.userActions ?? ['Contact support'] }
  );

// Validation helper functions

export const throwIfMissing = (obj: Record<string, unknown>, keys: string[]): void => {
  const missing = keys.filter((key) => obj[key] === undefined || obj[key] === null || obj[key] === '');
  if (missing.length > 0) {
    throw validationError(
      `Missing required fields: ${missing.join(', ')}`,
      ErrorCodes.VAL_MISSING_FIELD,
      { userActions: missing.map(field => `Provide ${field}`) }
    );
  }
};

export const validateEmail = (email: string): void => {
  if (!email || typeof email !== 'string') {
    throw validationError('Email is required', ErrorCodes.VAL_MISSING_FIELD);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw validationError('Invalid email format', ErrorCodes.VAL_INVALID_EMAIL, {
      userActions: ['Provide a valid email address (e.g., user@example.com)'],
    });
  }
};

export const validateAmount = (amount: unknown): void => {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0 || amount > 1_000_000) {
    throw validationError(
      'Amount must be a positive number between 0.01 and 1,000,000',
      ErrorCodes.VAL_INVALID_AMOUNT,
      { userActions: ['Enter an amount between 0.01 and 1,000,000'] }
    );
  }
};

export const validateCurrency = (currency: string): void => {
  const validCurrencies = ['cUSD', 'cREAL', 'CELO'];
  if (!validCurrencies.includes(currency)) {
    throw validationError(
      `Invalid currency. Must be one of: ${validCurrencies.join(', ')}`,
      ErrorCodes.VAL_INVALID_CURRENCY,
      { userActions: [`Use one of: ${validCurrencies.join(', ')}`] }
    );
  }
};

export const validateCeloAddress = (address: string): void => {
  if (!address || typeof address !== 'string') {
    throw validationError('Celo address is required', ErrorCodes.VAL_MISSING_FIELD);
  }
  if (!address.startsWith('0x') || address.length !== 42) {
    throw validationError(
      'Invalid Celo address format',
      ErrorCodes.VAL_INVALID_ADDRESS,
      { userActions: ['Provide a valid 42-character hex address starting with 0x'] }
    );
  }
  // Validate hex characters
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw validationError(
      'Invalid Celo address: contains invalid characters',
      ErrorCodes.VAL_INVALID_ADDRESS,
      { userActions: ['Address should only contain hexadecimal characters (0-9, a-f)'] }
    );
  }
};

export const validateTransactionHash = (txHash: string): void => {
  if (!txHash || typeof txHash !== 'string') {
    throw validationError('Transaction hash is required', ErrorCodes.VAL_MISSING_FIELD);
  }
  if (!txHash.startsWith('0x') || txHash.length !== 66) {
    throw validationError(
      'Invalid transaction hash format',
      ErrorCodes.VAL_INVALID_TX_HASH,
      { userActions: ['Provide a valid 66-character hex transaction hash starting with 0x'] }
    );
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    throw validationError(
      'Invalid transaction hash: contains invalid characters',
      ErrorCodes.VAL_INVALID_TX_HASH
    );
  }
};

// Error boundary for async handlers
export const asyncHandler = <T>(
  fn: (req: T, res: unknown, next: (err?: unknown) => void) => Promise<void>
) => {
  return (req: T, res: unknown, next: (err?: unknown) => void): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Safe error extraction for logging
export const sanitizeErrorForLogging = (error: unknown): Record<string, unknown> => {
  if (error instanceof RequestError) {
    return {
      code: error.code,
      message: error.message,
      type: error.type,
      category: error.category,
      severity: error.severity,
      requestId: error.requestId,
      httpStatus: error.httpStatus,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Sanitize stack trace (remove paths)
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    };
  }
  return { error: String(error) };
};

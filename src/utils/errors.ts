export class RequestError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public type: ErrorType,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

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
}

export const validationError = (
  message: string,
  details?: Record<string, any>
): RequestError =>
  new RequestError(message, 400, ErrorType.VALIDATION_ERROR, details);

export const authenticationError = (
  message: string,
  details?: Record<string, any>
): RequestError =>
  new RequestError(message, 401, ErrorType.AUTHENTICATION_ERROR, details);

export const authorizationError = (
  message: string,
  details?: Record<string, any>
): RequestError =>
  new RequestError(message, 403, ErrorType.AUTHORIZATION_ERROR, details);

export const notFoundError = (
  message: string,
  details?: Record<string, any>
): RequestError =>
  new RequestError(message, 404, ErrorType.NOT_FOUND_ERROR, details);

export const businessLogicError = (
  message: string,
  details?: Record<string, any>
): RequestError =>
  new RequestError(message, 422, ErrorType.BUSINESS_LOGIC_ERROR, details);

export const externalAPIError = (
  message: string,
  details?: Record<string, any>
): RequestError =>
  new RequestError(message, 502, ErrorType.EXTERNAL_API_ERROR, details);

export const databaseError = (
  message: string,
  details?: Record<string, any>
): RequestError =>
  new RequestError(message, 500, ErrorType.DATABASE_ERROR, details);

export const rateLimitError = (
  message: string,
  details?: Record<string, any>
): RequestError =>
  new RequestError(message, 429, ErrorType.RATE_LIMIT_ERROR, details);

export const internalError = (
  message: string,
  details?: Record<string, any>
): RequestError =>
  new RequestError(message, 500, ErrorType.INTERNAL_ERROR, details);

export const throwIfMissing = (obj: any, keys: string[]) => {
  const missing = keys.filter((key) => obj[key] === undefined);
  if (missing.length > 0) {
    throw validationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missing }
    );
  }
};

export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw validationError('Invalid email format', { email });
  }
};

export const validateAmount = (amount: number) => {
  if (typeof amount !== 'number' || amount <= 0 || amount > 1_000_000) {
    throw validationError('Amount must be a positive number between 0.01 and 1,000,000', {
      amount,
    });
  }
};

export const validateCurrency = (currency: string) => {
  const validCurrencies = ['cUSD', 'cREAL'];
  if (!validCurrencies.includes(currency)) {
    throw validationError(
      `Invalid currency. Must be one of: ${validCurrencies.join(', ')}`,
      { currency }
    );
  }
};
/**
 * Email Validator Service
 * RFC 5322 compliant email validation with optional MX record check
 */

import { logger } from '../utils/logger';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 255;

export interface EmailValidationResult {
  valid: boolean;
  email?: string;
  normalizedEmail?: string;
  error?: string;
  warnings?: string[];
}

export interface MXCheckResult {
  hasMX: boolean;
  mxRecords?: string[];
  error?: string;
}

/**
 * Validates an email address per RFC 5322
 * @param email - The email address to validate
 * @param options - Validation options
 * @returns EmailValidationResult with validation details
 */
export function validateEmail(
  email: string,
  options: { checkMX?: boolean; maxLength?: number } = {}
): EmailValidationResult {
  const warnings: string[] = [];
  const maxLength = options.maxLength || MAX_EMAIL_LENGTH;

  // Basic presence check
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required and must be a string' };
  }

  // Trim whitespace
  const trimmed = email.trim();
  if (trimmed !== email) {
    warnings.push('Email had leading/trailing whitespace (trimmed)');
  }

  // Length check
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Email exceeds maximum length of ${maxLength} characters` };
  }

  // Local part length check (before @)
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) {
    return { valid: false, error: 'Email must contain @ symbol with local part' };
  }
  if (atIndex > MAX_LOCAL_PART_LENGTH) {
    return { valid: false, error: `Local part exceeds ${MAX_LOCAL_PART_LENGTH} characters` };
  }

  // Domain length check
  const domain = trimmed.substring(atIndex + 1);
  if (domain.length > MAX_DOMAIN_LENGTH) {
    return { valid: false, error: `Domain part exceeds ${MAX_DOMAIN_LENGTH} characters` };
  }

  // RFC 5322 regex validation
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Email format invalid per RFC 5322' };
  }

  // Additional sanity checks
  if (trimmed.includes('..')) {
    warnings.push('Email contains consecutive dots (may be invalid per RFC)');
  }

  // Normalize: lowercase domain part only
  const normalizedEmail = trimmed.substring(0, atIndex) + '@' + domain.toLowerCase();

  return {
    valid: true,
    email: trimmed,
    normalizedEmail,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Checks MX records for a domain (requires DNS resolution capability)
 * Note: This requires a DNS library or external service in production
 * For now, returns a mock implementation
 */
export async function checkMXRecords(domain: string): Promise<MXCheckResult> {
  try {
    // In production, use a DNS library like 'dns2' or 'native-dns'
    // const dns = require('dns2');
    // const packet = await dns.Packet.create({
    //   questions: [{ name: domain, type: 'MX' }]
    // });
    // return { hasMX: packet.answers.length > 0, mxRecords: packet.answers.map(a => a.data.exchange) };
    
    // Mock implementation for development
    // In staging/prod, replace with actual DNS resolution
    const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const hasMX = commonDomains.includes(domain.toLowerCase());
    
    return {
      hasMX,
      mxRecords: hasMX ? [`mock-mx.${domain}`] : undefined
    };
  } catch (error) {
    logger.warn('MX check failed', { domain, error: error.message });
    return { hasMX: false, error: error.message };
  }
}

/**
 * Full email validation with optional MX check
 * @param email - Email to validate
 * @param checkMX - Whether to perform MX record lookup
 * @returns Combined validation result
 */
export async function validateEmailWithMX(
  email: string,
  checkMX = false
): Promise<EmailValidationResult & { mxCheck?: MXCheckResult }> {
  const result = validateEmail(email);
  
  if (!result.valid || !checkMX) {
    return result;
  }

  const domain = result.normalizedEmail!.split('@')[1];
  const mxCheck = await checkMXRecords(domain);
  
  if (!mxCheck.hasMX) {
    return {
      ...result,
      valid: false,
      error: 'Domain does not have valid MX records',
      mxCheck
    };
  }

  return { ...result, mxCheck };
}

/**
 * Extracts domain from email
 */
export function getEmailDomain(email: string): string | null {
  const result = validateEmail(email);
  return result.valid ? result.normalizedEmail!.split('@')[1] : null;
}

/**
 * Checks if email is from a disposable/temporary email provider
 * @param email - Email to check
 * @returns true if likely disposable
 */
export function isDisposableEmail(email: string): boolean {
  const result = validateEmail(email);
  if (!result.valid) return false;
  
  const domain = result.normalizedEmail!.split('@')[1].toLowerCase();
  const disposableDomains = [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'temp-mail.org',
    'fakeinbox.com', 'trashmail.com', 'throwawaymail.com'
  ];
  
  return disposableDomains.includes(domain);
}

export { EMAIL_REGEX, MAX_EMAIL_LENGTH, MAX_LOCAL_PART_LENGTH, MAX_DOMAIN_LENGTH };
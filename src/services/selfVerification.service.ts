/**
 * Self Protocol — ZK Identity Verification
 *
 * Self Protocol enables zero-knowledge identity verification:
 * - Sender proves they're a real human (not a bot) without revealing personal data
 * - Recipient proves they control the claim wallet
 * - Compliance checkable (KYC-passable) with zero data retention
 *
 * Integration: QR-based verification flow via Self Protocol REST API
 * Docs: https://docs.self.xyz
 * SDK: @selfxyz/core (install: npm install @selfxyz/core)
 */

import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const SELF_API_BASE = process.env.SELF_API_URL || 'https://api.self.xyz/v2';
const SELF_APP_ID   = process.env.SELF_APP_ID   || '';
const SELF_APP_SECRET = process.env.SELF_APP_SECRET || '';
const BASE_URL      = process.env.BASE_URL || 'http://localhost:3001';

// Self Protocol attribute scopes
const DEFAULT_ATTRIBUTES = ['minimumAge', 'nationality', 'name'];

export interface SelfVerificationRequest {
  verificationId: string;
  verificationUrl: string;
  deepLink: string;
  qrCode: string;
  expiresAt: string;
}

export interface SelfVerificationResult {
  verified: boolean;
  verificationId: string;
  proof?: string;
  nullifier?: string;        // ZK nullifier — proves uniqueness without identity
  disclosedFields?: Record<string, string>;
  issuingCountry?: string;
}

export class SelfVerificationService {
  private readonly configured: boolean;

  constructor() {
    this.configured = !!(SELF_APP_ID && SELF_APP_SECRET);
    if (!this.configured) {
      logger.warn('Self Protocol: SELF_APP_ID/SELF_APP_SECRET not set — running in demo mode');
    }
  }

  /**
   * Create a Self Protocol verification request.
   * Returns a QR code URL and deep link for the Self app.
   *
   * In production: user scans QR with Self mobile app,
   * generates ZK proof from their passport/ID on-device.
   * Zero PII leaves the device.
   */
  async createVerificationRequest(
    email: string,
    remittanceId: string,
    options?: {
      attributes?: string[];
      minimumAge?: number;
    }
  ): Promise<SelfVerificationRequest> {
    const verificationId = uuidv4();
    const callbackUrl = `${BASE_URL}/api/verifications/callback/${verificationId}`;

    if (!this.configured) {
      // Demo mode — returns mock verification that auto-passes
      logger.info(`Self Protocol (demo): verification request for ${email}`);
      return {
        verificationId,
        verificationUrl: `https://app.self.xyz/verify?id=${verificationId}&demo=true`,
        deepLink: `self://verify?id=${verificationId}`,
        qrCode: `data:text/plain;base64,${Buffer.from(verificationId).toString('base64')}`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    }

    try {
      const res = await fetch(`${SELF_API_BASE}/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SELF_APP_SECRET}`,
          'X-App-ID': SELF_APP_ID,
        },
        body: JSON.stringify({
          appId: SELF_APP_ID,
          scope: options?.attributes || DEFAULT_ATTRIBUTES,
          callbackUrl,
          metadata: { email, remittanceId },
          minimumAge: options?.minimumAge || 18,
          // ZK config: prove age + nationality without revealing exact birthdate/passport number
          disclosures: {
            minimumAge: options?.minimumAge || 18,
            excludedCountries: [],  // no restrictions by default
            ofacCheck: true,        // OFAC sanctions screening (required for compliance)
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Self API error ${res.status}: ${err.slice(0, 120)}`);
      }

      const data = await res.json();

      return {
        verificationId: data.id || verificationId,
        verificationUrl: data.verificationUrl,
        deepLink: data.deepLink || `self://verify?id=${data.id}`,
        qrCode: data.qrCode || '',
        expiresAt: data.expiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      logger.error('Self Protocol verification request failed', error);
      throw new Error(`Self verification failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check verification status and retrieve ZK proof result.
   * NEVER crashes — returns { verified: false } on any error.
   */
  async checkVerification(verificationId: string): Promise<SelfVerificationResult> {
    if (!this.configured) {
      // Demo mode — always passes
      return {
        verified: true,
        verificationId,
        nullifier: `demo-nullifier-${verificationId}`,
        disclosedFields: { minimumAge: 'true', sanctionsCheck: 'passed' },
      };
    }

    // 10s timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${SELF_API_BASE}/verifications/${verificationId}`, {
        headers: {
          'Authorization': `Bearer ${SELF_APP_SECRET}`,
          'X-App-ID': SELF_APP_ID,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        logger.warn(`Self Protocol API returned ${res.status} — treating as unverified`);
        return { verified: false, verificationId };
      }

      const data = await res.json();

      return {
        verified: data.status === 'verified',
        verificationId,
        proof: data.proof,
        nullifier: data.nullifier,
        disclosedFields: data.disclosedFields,
        issuingCountry: data.issuingCountry,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Log warning but NEVER crash — return unverified
      if (error.name === 'AbortError') {
        logger.warn('Self Protocol API timeout (>10s) — returning unverified');
      } else {
        logger.warn('Self Protocol API unreachable — returning unverified', { error: error.message });
      }
      
      return { verified: false, verificationId };
    }
  }

  /**
   * Handle callback from Self app after user completes verification.
   * Called by POST /api/verifications/callback/:id
   */
  async handleCallback(payload: Record<string, unknown>): Promise<SelfVerificationResult> {
    const verificationId = payload.id as string;

    if (!verificationId) {
      throw new Error('Missing verification ID in callback');
    }

    logger.info(`Self Protocol callback received: ${verificationId}`);

    // Re-check status to confirm — don't trust callback payload alone
    return this.checkVerification(verificationId);
  }

  /**
   * Quick check: is this verification configured and ready?
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Get integration status for health checks + README proof
   */
  getStatus() {
    return {
      configured: this.configured,
      mode: this.configured ? 'production' : 'demo',
      apiBase: SELF_API_BASE,
      appId: SELF_APP_ID ? `${SELF_APP_ID.slice(0, 8)}...` : 'not set',
      attributes: DEFAULT_ATTRIBUTES,
      zkFeatures: ['minimumAge', 'ofacCheck', 'nullifier', 'countryCheck'],
    };
  }
}

export const selfVerificationService = new SelfVerificationService();

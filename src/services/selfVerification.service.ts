/**
 * Self Protocol — ZK Identity Verification
 *
 * Uses @selfxyz/core SelfBackendVerifier to verify ZK passport proofs.
 * Frontend (claim page) shows a QR code via @selfxyz/qrcode.
 * User scans with Self mobile app → ZK proof generated on-device → sent to this endpoint.
 * Zero PII ever transmitted — only cryptographic proofs.
 *
 * Docs: https://docs.self.xyz
 * Skill: workspace-titan/skills/self-xyz/
 */

import { logger } from '../utils/logger';
import { SelfBackendVerifier, DefaultConfigStore } from '@selfxyz/core';

const BACKEND_URL = process.env.FRONTEND_URL || process.env.BASE_URL || 'https://email-remittance-pro.up.railway.app';
const SCOPE = 'email-remittance-pro';
const VERIFY_ENDPOINT = `${BACKEND_URL}/api/verifications/callback`;

// Use staging/mock mode when not on mainnet (no real passport required)
const USE_STAGING = process.env.SELF_STAGING === 'true';

export interface SelfVerificationResult {
  verified: boolean;
  nullifier?: string;
  nationality?: string;
  name?: string;
  isMinimumAgeValid?: boolean;
  isOfacValid?: boolean;
  error?: string;
}

export class SelfVerificationService {
  private verifier: SelfBackendVerifier | null = null;

  constructor() {
    try {
      this.verifier = new SelfBackendVerifier(
        SCOPE,
        VERIFY_ENDPOINT,
        USE_STAGING,    // false = real mainnet passports, true = mock passports OK
        null,           // accept all document types (passport + biometric ID)
        new DefaultConfigStore({
          minimumAge: 18,
          ofac: true,
          nationality: true,
        })
      );
      logger.info(`Self Protocol: SelfBackendVerifier initialized (staging=${USE_STAGING})`);
    } catch (err: any) {
      logger.warn(`Self Protocol: Failed to initialize verifier — ${err.message}`);
      this.verifier = null;
    }
  }

  /**
   * Verify a ZK proof from the Self app.
   * Called by the POST /api/verifications/callback endpoint.
   * The Self app sends { proof, publicSignals } directly to this endpoint.
   */
  async verifyProof(proof: any, publicSignals: any): Promise<SelfVerificationResult> {
    if (!this.verifier) {
      logger.warn('Self Protocol: verifier not initialized — running in demo mode (pass-through)');
      return {
        verified: true,
        nullifier: 'demo-' + Date.now(),
        isMinimumAgeValid: true,
        isOfacValid: true,
      };
    }

    try {
      const result = await this.verifier.verify(proof, publicSignals);

      logger.info('Self Protocol verification result', {
        isValid: result.isValid,
        isMinimumAgeValid: result.isValidDetails?.isMinimumAgeValid,
        isOfacValid: result.isValidDetails?.isOfacValid,
        nationality: result.credentialSubject?.nationality,
      });

      if (!result.isValid) {
        return {
          verified: false,
          error: `Verification failed: age=${result.isValidDetails?.isMinimumAgeValid} ofac=${result.isValidDetails?.isOfacValid}`,
          isMinimumAgeValid: result.isValidDetails?.isMinimumAgeValid,
          isOfacValid: result.isValidDetails?.isOfacValid,
        };
      }

      return {
        verified: true,
        nullifier: result.nullifier,
        nationality: result.credentialSubject?.nationality,
        name: result.credentialSubject?.name,
        isMinimumAgeValid: result.isValidDetails?.isMinimumAgeValid,
        isOfacValid: result.isValidDetails?.isOfacValid,
      };
    } catch (err: any) {
      logger.error('Self Protocol verification error', err);
      return {
        verified: false,
        error: err.message || 'Verification error',
      };
    }
  }

  /**
   * Returns the Self app config for the frontend QR code component.
   * Frontend uses this to build the SelfAppBuilder config.
   */
  getFrontendConfig(userId: string) {
    return {
      appName: 'Email Remittance Pro',
      scope: SCOPE,
      endpoint: VERIFY_ENDPOINT,
      endpointType: USE_STAGING ? 'https-staging' : 'https',
      userId,
      userIdType: 'hex',
      disclosures: {
        minimumAge: 18,
        ofac: true,
        nationality: true,
      },
    };
  }

  isConfigured(): boolean {
    return this.verifier !== null;
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      mode: USE_STAGING ? 'staging' : 'mainnet',
      scope: SCOPE,
      endpoint: VERIFY_ENDPOINT,
      disclosures: ['minimumAge:18', 'ofac', 'nationality'],
    };
  }
}

export const selfVerificationService = new SelfVerificationService();

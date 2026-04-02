/**
 * Self Protocol V2 — Sender Identity Verification
 *
 * Used in service wallet mode only. Requires:
 *   - name
 *   - date_of_birth
 *   - nationality
 *   - OFAC screening
 *
 * Separate from claim verification (which only checks age 18+).
 * One-time per session — frontend caches after first successful verify.
 *
 * Scope: 'email-remittance-sender' (different from claim scope to avoid config conflicts)
 */

import { logger } from '../utils/logger';
import { SelfBackendVerifier, AllIds, DefaultConfigStore } from '@selfxyz/core';

const BACKEND_URL = process.env.BASE_URL || 'https://email-remittance-pro.up.railway.app';
const SCOPE = 'email-remittance-sender';
const VERIFY_ENDPOINT = `${BACKEND_URL}/api/verifications/sender-callback`;
const MOCK_PASSPORT = process.env.SELF_STAGING === 'true';

export interface SelfSenderVerificationResult {
  verified: boolean;
  documentType?: string;
  nationality?: string;
  name?: string | string[];
  dateOfBirth?: string;
  isMinimumAgeValid?: boolean;
  isOfacValid?: boolean;
  discloseOutput?: Record<string, any>;
  error?: string;
}

let verifierInstance: SelfBackendVerifier | null = null;

function getVerifier(): SelfBackendVerifier | null {
  if (verifierInstance) return verifierInstance;
  try {
    verifierInstance = new SelfBackendVerifier(
      SCOPE,
      VERIFY_ENDPOINT,
      MOCK_PASSPORT,
      AllIds,
      new DefaultConfigStore({
        minimumAge: 18,
        ofac: true,
      }),
      'hex'
    );
    logger.info(`Self Sender Verifier initialized (mockPassport=${MOCK_PASSPORT})`);
    return verifierInstance;
  } catch (err: any) {
    logger.warn(`Self Sender Verifier init failed — ${err.message}`);
    return null;
  }
}

export class SelfSenderVerificationService {
  async verifyProof(
    attestationId: 1 | 2 | 3 | 4,
    proof: any,
    pubSignals: any,
    userContextData: string
  ): Promise<SelfSenderVerificationResult> {
    const verifier = getVerifier();

    if (!verifier) {
      logger.warn('Self Sender: verifier not initialized — demo pass-through');
      return {
        verified: true,
        isMinimumAgeValid: true,
        isOfacValid: true,
        documentType: 'demo',
        name: 'Demo User',
        nationality: 'DEMO',
      };
    }

    try {
      const result = await verifier.verify(
        attestationId,
        proof,
        pubSignals,
        userContextData
      );

      const docType =
        attestationId === 1 ? 'passport' :
        attestationId === 2 ? 'eu_id_card' :
        attestationId === 3 ? 'aadhaar' : 'kyc';

      if (!result.isValidDetails?.isValid) {
        return {
          verified: false,
          documentType: docType,
          isMinimumAgeValid: result.isValidDetails?.isMinimumAgeValid,
          isOfacValid: result.isValidDetails?.isOfacValid,
          error: `Sender verification failed: ofac=${result.isValidDetails?.isOfacValid}`,
        };
      }

      return {
        verified: true,
        documentType: docType,
        nationality: result.discloseOutput?.nationality,
        name: result.discloseOutput?.name,
        dateOfBirth: result.discloseOutput?.dateOfBirth,
        isMinimumAgeValid: result.isValidDetails?.isMinimumAgeValid,
        isOfacValid: result.isValidDetails?.isOfacValid,
        discloseOutput: result.discloseOutput,
      };
    } catch (err: any) {
      if (err.name === 'ConfigMismatchError') {
        logger.error('Self Sender: config mismatch', err.issues);
        return { verified: false, error: `Config mismatch: ${JSON.stringify(err.issues)}` };
      }
      logger.error('Self Sender verification error', err);
      return { verified: false, error: err.message || 'Verification error' };
    }
  }

  getStatus() {
    return {
      configured: !!getVerifier(),
      mode: MOCK_PASSPORT ? 'staging/mock' : 'mainnet/real',
      scope: SCOPE,
      endpoint: VERIFY_ENDPOINT,
      disclosures: ['name', 'date_of_birth', 'nationality', 'ofac'],
    };
  }
}

export const senderVerificationService = new SelfSenderVerificationService();

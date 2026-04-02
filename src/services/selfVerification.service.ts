/**
 * Self Protocol V2 — ZK Identity Verification
 *
 * Uses @selfxyz/core SelfBackendVerifier (V2 API) to verify ZK passport proofs.
 * Frontend (claim page) shows a QR code via @selfxyz/qrcode.
 * User scans with Self mobile app → ZK proof generated on-device → sent to this endpoint.
 * Zero PII ever transmitted — only cryptographic proofs.
 *
 * V2 API: verify(attestationId, proof, pubSignals, userContextData)
 * Boilerplate: https://github.com/selfxyz/self-integration-boilerplate/tree/backend-verification
 * Migration: https://docs.self.xyz/use-self/migration-v1-v2
 */

import { logger } from '../utils/logger';
import { SelfBackendVerifier, AllIds, DefaultConfigStore } from '@selfxyz/core';

const BACKEND_URL = process.env.BASE_URL || 'https://email-remittance-pro.up.railway.app';
const SCOPE = 'email-remittance-pro';
const VERIFY_ENDPOINT = `${BACKEND_URL}/api/verifications/callback`;

// true = staging/mock passports OK (for demo); false = real mainnet passports only
const MOCK_PASSPORT = process.env.SELF_STAGING === 'true';

export interface SelfVerificationResult {
  verified: boolean;
  nullifier?: string;
  nationality?: string;
  name?: string | string[];
  documentType?: string;
  isMinimumAgeValid?: boolean;
  isOfacValid?: boolean;
  discloseOutput?: Record<string, any>;
  error?: string;
}

// Reuse a single verifier instance (per boilerplate recommendation)
let verifierInstance: SelfBackendVerifier | null = null;

function getVerifier(): SelfBackendVerifier | null {
  if (verifierInstance) return verifierInstance;
  try {
    verifierInstance = new SelfBackendVerifier(
      SCOPE,
      VERIFY_ENDPOINT,
      MOCK_PASSPORT,    // true = staging/mock, false = real passports
      AllIds,           // Accept all document types (passport, EU ID, Aadhaar, KYC)
      new DefaultConfigStore({
        minimumAge: 18,
      }),
      'hex'             // userIdentifierType — claim token is hex
    );
    logger.info(`Self Protocol V2: verifier initialized (mockPassport=${MOCK_PASSPORT}, scope=${SCOPE})`);
    return verifierInstance;
  } catch (err: any) {
    logger.warn(`Self Protocol V2: verifier init failed — ${err.message}`);
    return null;
  }
}

export class SelfVerificationService {
  /**
   * Verify a ZK proof from the Self app (V2 API).
   * Self app sends: { attestationId, proof, pubSignals, userContextData }
   * Called by POST /api/verifications/callback
   */
  async verifyProof(
    attestationId: 1 | 2 | 3 | 4,
    proof: any,
    pubSignals: any,
    userContextData: string
  ): Promise<SelfVerificationResult> {
    const verifier = getVerifier();

    if (!verifier) {
      logger.warn('Self Protocol: verifier not initialized — demo pass-through');
      return {
        verified: true,
        isMinimumAgeValid: true,
        isOfacValid: true,
        documentType: 'demo',
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
        attestationId === 3 ? 'aadhaar' :
        'kyc';

      logger.info('Self Protocol V2 verification result', {
        isValid: result.isValidDetails?.isValid,
        isMinimumAgeValid: result.isValidDetails?.isMinimumAgeValid,
        isOfacValid: result.isValidDetails?.isOfacValid,
        documentType: docType,
        nationality: result.discloseOutput?.nationality,
      });

      if (!result.isValidDetails?.isValid) {
        return {
          verified: false,
          documentType: docType,
          isMinimumAgeValid: result.isValidDetails?.isMinimumAgeValid,
          isOfacValid: result.isValidDetails?.isOfacValid,
          error: `Verification failed: age=${result.isValidDetails?.isMinimumAgeValid} ofac=${result.isValidDetails?.isOfacValid}`,
        };
      }

      return {
        verified: true,
        documentType: docType,
        nationality: result.discloseOutput?.nationality,
        name: result.discloseOutput?.name || '',
        isMinimumAgeValid: result.isValidDetails?.isMinimumAgeValid,
        isOfacValid: result.isValidDetails?.isOfacValid,
        discloseOutput: result.discloseOutput,
      };
    } catch (err: any) {
      // ConfigMismatchError = frontend disclosures don't match backend config
      if (err.name === 'ConfigMismatchError') {
        logger.error('Self Protocol: config mismatch between frontend and backend', err.issues);
        return {
          verified: false,
          error: `Config mismatch: ${JSON.stringify(err.issues)}`,
        };
      }
      logger.error('Self Protocol verification error', err);
      return {
        verified: false,
        error: err.message || 'Verification error',
      };
    }
  }

  /**
   * Returns the Self app config for the frontend QR code component (V2).
   * Frontend uses SelfAppBuilder with version: 2.
   */
  getFrontendConfig(userId: string) {
    return {
      appName: 'Email Remittance Pro',
      scope: SCOPE,
      endpoint: VERIFY_ENDPOINT,
      endpointType: MOCK_PASSPORT ? 'https-staging' : 'https',
      version: 2,
      userId,
      userIdType: 'hex',
      disclosures: {
        minimumAge: 18,
        ofac: true,
        nationality: true,
      },
    };
  }

  getStatus() {
    return {
      configured: !!getVerifier(),
      mode: MOCK_PASSPORT ? 'staging/mock' : 'mainnet/real',
      scope: SCOPE,
      endpoint: VERIFY_ENDPOINT,
      disclosures: ['minimumAge:18', 'ofac', 'nationality'],
    };
  }
}

export const selfVerificationService = new SelfVerificationService();

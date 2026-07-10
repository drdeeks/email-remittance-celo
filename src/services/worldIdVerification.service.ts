/**
 * World ID Verification Service
 *
 * Real server-side verification of Worldcoin World ID proofs (from @worldcoin/idkit
 * on the frontend) against the Worldcoin Developer Portal verify endpoint.
 *
 * Graceful degradation: if WORLDID_APP_ID / WORLDID_APP_SECRET are not set, the
 * service returns `{ configured: false }` WITHOUT throwing so the server still boots
 * and runs with no verification configured.
 *
 * Replay protection: verified nullifier hashes are tracked in an in-memory Set.
 * NOTE: this is per-process only — for multi-instance / persistent deployments this
 * should be backed by a DB table (see identity_verifications.nullifier).
 */

import { logger } from '../utils/logger';
import { selfConfig } from '../config/self';

const usedNullifiers = new Set<string>();

export interface WorldIdVerifyResult {
  success: boolean;
  configured: boolean;
  nullifierHash?: string;
  verificationLevel?: string;
  alreadyUsed?: boolean;
  error?: string;
  code?: string;
  detail?: string;
}

export function isNullifierUsed(nullifierHash: string): boolean {
  return usedNullifiers.has(nullifierHash);
}

export function recordNullifier(nullifierHash: string): void {
  if (nullifierHash) usedNullifiers.add(nullifierHash);
}

/**
 * Verify a World ID proof produced by @worldcoin/idkit.
 *
 * @param proof            The IDKit success result (nullifier_hash, merkle_root, proof, verification_level).
 * @param signal           Optional signal that was hashed into the proof (e.g. recipient wallet).
 * @param expectedAction   Optional action id configured in the Worldcoin Developer Portal.
 */
export async function verifyWorldIdProof(
  proof: any,
  signal?: string,
  expectedAction?: string
): Promise<WorldIdVerifyResult> {
  const appId = selfConfig.worldId.appId || process.env.WORLDID_APP_ID || '';
  const appSecret = selfConfig.worldId.appSecret || process.env.WORLDID_APP_SECRET || '';

  if (!appId || !appSecret) {
    return { success: false, configured: false, error: 'World ID not configured (WORLDID_APP_ID / WORLDID_APP_SECRET unset)' };
  }

  if (!proof) {
    return { success: false, configured: true, error: 'Missing World ID proof' };
  }

  const nullifierHash = proof.nullifier_hash ?? proof.nullifierHash;
  const merkleRoot = proof.merkle_root ?? proof.merkleRoot;
  const verificationLevel = proof.verification_level ?? proof.verificationLevel;
  const action = expectedAction ?? proof.action;
  const usedSignal = signal ?? proof.signal;

  // Fast local replay check before hitting the network.
  if (nullifierHash && isNullifierUsed(nullifierHash)) {
    return { success: false, configured: true, nullifierHash, alreadyUsed: true, error: 'World ID proof already used (replay detected)' };
  }

  const endpoint = `https://developer.worldcoin.org/api/v1/verify/${appId}`;

  const body: any = {
    nullifier_hash: nullifierHash,
    merkle_root: merkleRoot,
    proof: proof.proof,
    verification_level: verificationLevel,
    action,
    signal: usedSignal,
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appSecret}`,
      },
      body: JSON.stringify(body),
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      logger.warn('World ID verify rejected', { status: res.status, code: data?.code, detail: data?.detail });
      return {
        success: false,
        configured: true,
        nullifierHash,
        error: data?.detail || data?.code || `World ID verification failed (HTTP ${res.status})`,
        code: data?.code,
        detail: data?.detail,
      };
    }

    const success = data?.success === true || res.status === 200;
    const resolvedNullifier = data?.nullifier_hash ?? nullifierHash;

    if (success && resolvedNullifier && isNullifierUsed(resolvedNullifier)) {
      return { success: false, configured: true, nullifierHash: resolvedNullifier, alreadyUsed: true, error: 'World ID proof already used (replay detected)' };
    }

    return {
      success,
      configured: true,
      nullifierHash: resolvedNullifier,
      verificationLevel: data?.verification_level ?? verificationLevel,
    };
  } catch (err: any) {
    logger.error('World ID verification error', { error: err?.message });
    return { success: false, configured: true, error: `World ID verification error: ${err?.message || 'unknown'}` };
  }
}

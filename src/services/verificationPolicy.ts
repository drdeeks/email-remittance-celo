/**
 * Verification Policy
 *
 * The verification method is decided SERVER-SIDE by the FUNDING ENTITY (whoever funds
 * the escrow) — NEVER by the sender or recipient. Users cannot choose the method.
 *
 * Funding entity:
 *   - service mode  -> the server wallet address (operator funds the escrow)
 *   - personal mode -> the sender's wallet address (sender funds the escrow)
 *
 * Default = 'NONE' (no verification required). Operators may override globally via
 * DEFAULT_VERIFICATION_METHOD, or per-funding-entity via VERIFICATION_POLICY_JSON,
 * e.g. VERIFICATION_POLICY_JSON='{"0xSERVERWALLET":"SELF"}'.
 */

export type VerificationMethod = 'NONE' | 'SELF' | 'WORLDID';

export interface VerificationPolicyContext {
  walletMode: 'service' | 'personal';
  senderWallet?: string;
  serverWallet?: string;
}

function normalizeMethod(value?: string | null): VerificationMethod {
  const up = (value || '').toUpperCase();
  if (up === 'SELF' || up === 'WORLDID' || up === 'NONE') return up as VerificationMethod;
  return 'NONE';
}

/**
 * Resolves the funding entity address for the given context.
 */
export function getFundingEntity(ctx: VerificationPolicyContext): string | undefined {
  const entity = ctx.walletMode === 'personal' ? ctx.senderWallet : ctx.serverWallet;
  return entity || undefined;
}

/**
 * Server-side decision for which verification method a claim requires.
 * Any client-supplied method is intentionally ignored by callers.
 */
export function decideVerificationMethod(ctx: VerificationPolicyContext): VerificationMethod {
  const fundingEntity = getFundingEntity(ctx);

  const policyJson = process.env.VERIFICATION_POLICY_JSON;
  if (policyJson && fundingEntity) {
    try {
      const map = JSON.parse(policyJson) as Record<string, string>;
      const key = Object.keys(map).find((k) => k.toLowerCase() === fundingEntity.toLowerCase());
      if (key) return normalizeMethod(map[key]);
    } catch {
      // Malformed policy JSON — ignore and fall through to the global default.
    }
  }

  return normalizeMethod(process.env.DEFAULT_VERIFICATION_METHOD);
}

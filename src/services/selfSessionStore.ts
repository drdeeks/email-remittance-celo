/**
 * Self Protocol Sender Session Store
 *
 * After /api/verifications/sender-callback succeeds, a short-lived server-side
 * session token is issued and stored here. The frontend sends this token with
 * the /send request so the backend can verify the ZK proof was genuinely completed
 * — not just a client-side selfVerified:true flag.
 *
 * TTL: 30 minutes
 */

import { randomBytes } from 'crypto';

const SENDER_SESSION_TTL_MS = 30 * 60 * 1000;

interface SenderSession {
  userId: string;
  nationality?: string;
  name?: string | string[];
  documentType?: string;
  verifiedAt: number;
}

const sessions = new Map<string, SenderSession>();

setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.verifiedAt > SENDER_SESSION_TTL_MS) {
      sessions.delete(token);
    }
  }
}, 5 * 60 * 1000).unref(); // .unref() prevents timer from blocking process exit in tests

export function createSenderSession(userId: string, data: Omit<SenderSession, 'userId' | 'verifiedAt'>): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { userId, verifiedAt: Date.now(), ...data });
  return token;
}

export function validateSenderSession(token: string): SenderSession | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.verifiedAt > SENDER_SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function revokeSenderSession(token: string): void {
  sessions.delete(token);
}

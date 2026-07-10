'use client';

/**
 * World ID verification widget (real SDK — @worldcoin/idkit v4).
 *
 * v4 exposes `useIDKitRequest` + `IDKitRequestWidget` (there is no `IDKitProvider`
 * in v4). The recipient proves personhood to World App; the resulting proof is
 * forwarded to the backend `POST /api/verification/worldid/verify`, then
 * `onVerified` is called so the parent claim request can include it.
 */

import { useEffect, useState } from 'react';
import { IDKitRequestWidget, orbLegacy } from '@worldcoin/idkit';
import { Loader2, CheckCircle2, XCircle, ShieldCheckIcon } from 'lucide-react';

interface WorldIdVerificationProps {
  recipientToken?: string;
  onVerified: (result: any) => void;
  onError?: (error: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// v4 requires `app_<string>`; fall back to a placeholder so the build never breaks.
const WORLD_ID_APP_ID = (process.env.NEXT_PUBLIC_WORLDID_APP_ID ||
  'app_staging') as `app_${string}`;

export default function WorldIdVerification({
  recipientToken,
  onVerified,
  onError,
}: WorldIdVerificationProps) {
  const [open, setOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingRp, setLoadingRp] = useState(false);
  // rp_context is required by the v4 SDK; it is issued/signed by the backend.
  const [rpContext, setRpContext] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingRp(true);
    fetch(
      `${API_URL}/api/verification/worldid/rp-context${
        recipientToken ? `?token=${encodeURIComponent(recipientToken)}` : ''
      }`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.rpContext) setRpContext(data.rpContext);
      })
      .catch(() => {
        /* backends without the endpoint fall back to an unsigned context below */
      })
      .finally(() => {
        if (!cancelled) setLoadingRp(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipientToken]);

  const effectiveRpContext =
    rpContext ?? {
      rp_id: '',
      nonce: '',
      created_at: 0,
      expires_at: 0,
      signature: '',
    };

  const handleSuccess = async (result: any) => {
    try {
      const res = await fetch(`${API_URL}/api/verification/worldid/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recipientToken, result }),
      });
      if (!res.ok) throw new Error('Backend verification failed');
      setVerified(true);
      onVerified(result);
    } catch (e: any) {
      const message = e?.message || 'Verification failed';
      setError(message);
      onError?.(message);
    }
  };

  if (verified) {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-800/50 border border-emerald-500/30 rounded-xl p-6 text-center space-y-2">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Humanity Verified</h3>
        <p className="text-sm text-gray-400">
          World ID proof accepted. You can now claim your remittance.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4 text-center">
      <ShieldCheckIcon className="w-10 h-10 text-sky-400 mx-auto" />
      <div>
        <h3 className="text-lg font-bold text-white">Verify with World ID</h3>
        <p className="text-sm text-gray-400">
          Prove you&apos;re a unique human with World ID to claim this remittance.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <XCircle className="w-4 h-4 inline mr-1" />
          {error}
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        disabled={loadingRp}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:opacity-50 font-semibold text-white transition-all flex items-center justify-center gap-2"
      >
        {loadingRp ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Verify with World ID'
        )}
      </button>

      <IDKitRequestWidget
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
        app_id={WORLD_ID_APP_ID}
        action="email-remittance"
        allow_legacy_proofs={true}
        rp_context={effectiveRpContext}
        preset={orbLegacy()}
      />
    </div>
  );
}

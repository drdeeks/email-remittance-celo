'use client';

import { LockClosedIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface AuthToggleProps {
  requireAuth: boolean;
  onToggle: (value: boolean) => void;
}

export function AuthToggle({ requireAuth, onToggle }: AuthToggleProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-gray-400">Authorization Mode</label>
      
      <div className="flex gap-3">
        {/* Secure Option */}
        <button
          onClick={() => onToggle(true)}
          className={`flex-1 p-4 rounded-lg border transition-all text-left ${
            requireAuth
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <LockClosedIcon className={`w-5 h-5 ${requireAuth ? 'text-emerald-400' : 'text-gray-500'}`} />
            <span className={`font-medium ${requireAuth ? 'text-emerald-400' : 'text-gray-400'}`}>
              Secure
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Require Self Protocol verification
          </p>
        </button>

        {/* Open Option */}
        <button
          onClick={() => onToggle(false)}
          className={`flex-1 p-4 rounded-lg border transition-all text-left ${
            !requireAuth
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className={`w-5 h-5 ${!requireAuth ? 'text-amber-400' : 'text-gray-500'}`} />
            <span className={`font-medium ${!requireAuth ? 'text-amber-400' : 'text-gray-400'}`}>
              Open
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Anyone with link can claim
          </p>
        </button>
      </div>

      {/* Explanation */}
      <div className={`p-3 rounded-lg text-sm ${requireAuth ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
        {requireAuth ? (
          <>
            <LockClosedIcon className="w-4 h-4 inline mr-2" />
            Recipient must verify their identity with Self Protocol before claiming. More secure — prevents link theft.
          </>
        ) : (
          <>
            <ExclamationTriangleIcon className="w-4 h-4 inline mr-2" />
            Anyone who gets this link can claim the funds. Faster — but no identity check.
          </>
        )}
      </div>
    </div>
  );
}

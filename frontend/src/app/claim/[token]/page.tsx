'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { WalletIcon, GiftIcon } from '@heroicons/react/24/solid';

export default function ClaimPage() {
  const params = useParams();
  const token = params.token as string;
  const { address } = useAccount();
  const [payoutMethod, setPayoutMethod] = useState<'crypto' | 'giftcard'>('crypto');

  return (
    <main className="min-h-screen bg-[#020203] text-slate-100 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2rem] p-10 shadow-2xl">
            <h1 className="text-3xl font-black text-center mb-8">Claim <span className="text-[#00FFFF]">Remittance</span></h1>
            <div className="grid grid-cols-2 gap-6 mb-10">
                <button onClick={() => setPayoutMethod('crypto')} className={`p-6 rounded-3xl border transition-all ${payoutMethod === 'crypto' ? 'border-[#00FFFF] bg-[#00FFFF]/5 text-[#00FFFF]' : 'border-slate-800'}`}>
                    <WalletIcon className="h-8 w-8 mx-auto mb-2" />
                    <span className="text-xs font-black uppercase tracking-widest">Crypto</span>
                </button>
                <button onClick={() => setPayoutMethod('giftcard')} className={`p-6 rounded-3xl border transition-all ${payoutMethod === 'giftcard' ? 'border-[#6A0DAD] bg-[#6A0DAD]/5 text-[#6A0DAD]' : 'border-slate-800'}`}>
                    <GiftIcon className="h-8 w-8 mx-auto mb-2" />
                    <span className="text-xs font-black uppercase tracking-widest">Gift Card</span>
                </button>
            </div>
            <button className="w-full h-16 rounded-full bg-gradient-to-r from-[#00FFFF] to-[#6A0DAD] text-white font-black tracking-widest uppercase">EXECUTE CLAIM</button>
        </div>
    </main>
  );
}
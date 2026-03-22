'use client';

import { chainConfig, SupportedChainId } from '@/config/chains';
import Image from 'next/image';

interface ChainSelectorProps {
  selectedChain: SupportedChainId;
  onChainSelect: (chainId: SupportedChainId) => void;
}

const chainIds: SupportedChainId[] = [42220, 8453, 143];

export function ChainSelector({ selectedChain, onChainSelect }: ChainSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400">From Chain</label>
      <div className="flex gap-2">
        {chainIds.map((chainId) => {
          const chain = chainConfig[chainId];
          const isSelected = selectedChain === chainId;
          return (
            <button
              key={chainId}
              onClick={() => onChainSelect(chainId)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
              }`}
              style={isSelected ? { borderColor: chain.color, backgroundColor: `${chain.color}10` } : {}}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: chain.color, color: chainId === 42220 ? '#000' : '#fff' }}
              >
                {chain.symbol[0]}
              </div>
              <span className="font-medium">{chain.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

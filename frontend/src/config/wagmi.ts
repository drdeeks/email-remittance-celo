'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { celo, base } from 'wagmi/chains';
import { monad } from './chains';

export const config = getDefaultConfig({
  appName: 'Email Remittance',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [celo, base, monad],
  ssr: true,
});

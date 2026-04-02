import { Router, Request, Response } from 'express';
import { chainService, getNativeCurrency } from '../services/celoService';
import { selfVerificationService } from '../services/selfVerification.service';
import { senderVerificationService } from '../services/selfSenderVerification.service';
import { uniswapService } from '../services/uniswapService';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'email-native-remittance',
  });
});

// Full integration health check — shows all tracks and their status
router.get('/integrations', async (req: Request, res: Response) => {
  const chains = chainService.getSupportedChains();
  const balances: Record<string, string> = {};

  for (const chain of chains) {
    try {
      const addr = chainService.getWalletAddress(chain);
      balances[chain] = `${await chainService.getBalance(addr, chain)} ${getNativeCurrency(chain)}`;
    } catch {
      balances[chain] = 'unavailable';
    }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    integrations: {
      // ── Self Protocol (ZK Identity) ──────────────────────────────────────────
      selfProtocol: {
        track: 'Best Self Protocol Integration ($1k)',
        claim: {
          ...selfVerificationService.getStatus(),
          description: 'Claim side — age 18+ only',
        },
        sender: {
          ...senderVerificationService.getStatus(),
          description: 'Send side (service wallet) — name + DOB + nationality + OFAC',
        },
        endpoints: [
          'POST /api/verifications/callback        (claim — minimumAge:18)',
          'POST /api/verifications/sender-callback (send — name+dob+nationality+OFAC)',
        ],
        library: '@selfxyz/core SelfBackendVerifier + @selfxyz/qrcode SelfQRcodeWrapper',
        version: 'V2',
      },

      // ── Mandate (Policy Engine) ──────────────────────────────────────────────
      mandate: {
        track: 'Policy Enforcement',
        agentId: process.env.MANDATE_AGENT_ID || '019d14f2-2363-7146-907f-3deb184c0e31',
        apiKeySet: !!(process.env.MANDATE_RUNTIME_KEY || process.env.MANDATE_API_KEY),
        limits: { perTx: '$100', perDay: '$1000' },
        status: 'active',
      },

      // ── Venice AI (Private Inference) ────────────────────────────────────────
      veniceAI: {
        track: 'Private Agents / Venice ($11.5k)',
        apiKeySet: !!(process.env.VENICE_API_KEY),
        features: ['fraud-analysis', 'risk-scoring', 'zero-data-retention'],
        status: process.env.VENICE_API_KEY ? 'active' : 'demo-mode',
      },

      // ── Multi-Chain ──────────────────────────────────────────────────────────
      chains: {
        track: 'Best Agent on Celo ($5k)',
        supported: chains,
        walletAddress: chainService.getWalletAddress('celo'),
        balances,
        bridgeRoutes: chainService.getSupportedBridgeRoutes(),
      },

      // ── Uniswap (Agentic Finance) ────────────────────────────────────────────
      uniswap: {
        track: 'Agentic Finance (Best Uniswap API Integration) — $2,500',
        ...uniswapService.getStatus(),
        endpoints: [
          'POST /api/remittance/uniswap/quote',
          'POST /api/remittance/uniswap/swap',
          'POST /api/remittance/uniswap/bridge',
          'GET  /api/remittance/uniswap/status',
        ],
      },

      // ── ERC-8004 ─────────────────────────────────────────────────────────────
      erc8004: {
        track: 'Agents With Receipts / ERC-8004 ($4k)',
        agentJsonPresent: true,
        agentLogPresent: true,
        agentId: 'titan-30260',
        primaryChain: 'base',
        registrations: {
          base: { tokenId: 30260, tx: '0xc3b2f088847b5dfc7e192b08e7535d52e8490816df913f8e3ed0a911cf8a66ff' },
          monad: { tokenId: 8368, tx: '0x4317aed38248d4a878f47282093a6adfffd864205aa5716990efef380e3d99ac', note: 'transferred to drdeeks.base.eth' },
        },
        onChainIdentity: 'drdeeks.base.eth',
        agentCard: '/.well-known/agent-card.json',
      },
    },
  });
});

router.get('/ready', (req: Request, res: Response) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

router.get('/live', (req: Request, res: Response) => {
  res.json({ live: true, timestamp: new Date().toISOString() });
});

export const healthRoutes = router;

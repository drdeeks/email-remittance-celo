import { Router, Request, Response } from 'express';
import { chainService } from '../services/celoService';
import { selfVerificationService } from '../services/selfVerification.service';
import { mandateService } from '../services/mandateService';

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
      balances[chain] = `${await chainService.getBalance(addr, chain)} ${chainService.getNativeCurrency ? '' : ''}`;
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
        ...selfVerificationService.getStatus(),
        endpoints: [
          'POST /api/verifications/request',
          'GET  /api/verifications/:id',
          'POST /api/verifications/callback/:id',
        ],
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

      // ── ERC-8004 ─────────────────────────────────────────────────────────────
      erc8004: {
        track: 'Agents With Receipts / ERC-8004 ($4k)',
        agentJsonPresent: true,
        agentLogPresent: true,
        agentId: 'titan-3070917',
        onChainIdentity: 'drdeeks.base.eth',
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

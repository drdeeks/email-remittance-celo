import { Router, Request, Response, NextFunction } from 'express';
import { validationError, validateEmail, validateAmount } from '../utils/errors';
import { logger } from '../utils/logger';
import { remittanceService } from '../services/remittanceService';
import { detectChain, chainService, type SupportedChain } from '../services/celoService';
import { uniswapService } from '../services/uniswapService';
import { feeService, type FeeModel } from '../services/feeService';

const router = Router();

// Create a new remittance transaction
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { senderEmail, recipientEmail, amount, message, chain, currency, requireAuth, feeModel, senderWallet } = req.body;

    // Validate inputs
    if (!senderEmail || !recipientEmail) {
      throw validationError('Sender and recipient emails are required');
    }
    validateEmail(senderEmail);
    validateEmail(recipientEmail);
    validateAmount(amount);

    const amountCelo     = parseFloat(amount);
    const resolvedChain  = detectChain(currency, chain) as SupportedChain;
    const resolvedFeeModel: FeeModel = feeModel === 'premium' ? 'premium' : 'standard';

    // Get fee quote + generate per-remittance escrow address
    const feeQuote = await feeService.getFeeQuote(amountCelo, resolvedChain, resolvedFeeModel);

    const result = await remittanceService.createRemittance({
      senderEmail,
      recipientEmail,
      amountCelo,
      message,
      chain: resolvedChain,
      requireAuth: requireAuth === true || requireAuth === 'true',
      feeModel: resolvedFeeModel,
      escrowAddress: feeQuote.escrowAddress,
      escrowPrivateKey: feeQuote.escrowPrivateKey,
      senderWallet: senderWallet || '',
      feeAmount: feeQuote.feeAmount,
    });

    logger.info('Remittance created', {
      remittanceId: result.remittanceId,
      senderEmail,
      recipientEmail,
      amount: amountCelo,
      chain: resolvedChain,
      feeModel: resolvedFeeModel,
      escrowAddress: feeQuote.escrowAddress,
    });

    res.status(201).json({
      success: true,
      data: {
        remittanceId: result.remittanceId,
        claimToken: result.claimToken,
        txHash: result.txHash,
        expiresAt: new Date(result.expiresAt * 1000).toISOString(),
        claimUrl: `${process.env.FRONTEND_URL || process.env.BASE_URL}/claim/${result.claimToken}`,
        chain: resolvedChain,
        feeModel: resolvedFeeModel,
        // Sender needs to transfer funds here — frontend handles the wallet TX
        escrowAddress: feeQuote.escrowAddress,
        sendAmount: feeQuote.sendAmount,
        recipientReceives: feeQuote.recipientAmount,
        feeAmount: feeQuote.feeAmount,
        feeDescription: feeService.getFeeModelDescription(resolvedFeeModel, resolvedChain),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Claim a remittance
router.get('/claim/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { recipientWallet } = req.query;

    if (!token) {
      throw validationError('Claim token is required');
    }

    const result = await remittanceService.claimRemittance(
      token,
      recipientWallet as string | undefined
    );

    logger.info('Remittance claimed', { token, txHash: result.txHash });

    const response: any = {
      success: true,
      data: {
        txHash: result.txHash,
        amount: result.amount,
        explorerUrl: `https://explorer.celo.org/mainnet/tx/${result.txHash}`,
      },
      timestamp: new Date().toISOString(),
    };

    if (result.privateKey) {
      response.data.wallet = result.wallet;
      response.data.privateKey = result.privateKey;
      response.data.warning = '⚠️ SAVE YOUR PRIVATE KEY! This will only be shown once. You need it to access your funds.';
    }

    res.json(response);
  } catch (error: any) {
    // Special handling for VERIFICATION_REQUIRED error
    if (error.code === 'VERIFICATION_REQUIRED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'VERIFICATION_REQUIRED',
          message: error.message,
          verificationRequired: true,
        },
        timestamp: new Date().toISOString(),
      });
    }
    next(error);
  }
});

// Get remittance status by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const remittance = remittanceService.getRemittanceStatus(id);

    if (!remittance) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Remittance not found' },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        id: remittance.id,
        senderEmail: remittance.sender_email,
        recipientEmail: remittance.recipient_email,
        amount: remittance.amount_celo,
        status: remittance.status,
        message: remittance.message,
        createdAt: new Date(remittance.created_at * 1000).toISOString(),
        expiresAt: new Date(remittance.expires_at * 1000).toISOString(),
        claimedAt: remittance.claimed_at ? new Date(remittance.claimed_at * 1000).toISOString() : null,
        escrowTxHash: remittance.escrow_tx_hash,
        claimTxHash: remittance.claim_tx_hash,
        recipientWallet: remittance.recipient_wallet,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Demo endpoint for hackathon
router.post('/demo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Creating demo remittance');

    const result = await remittanceService.createRemittance({
      senderEmail: 'titan@openclaw.ai',
      recipientEmail: 'drdeeks@outlook.com',
      amountCelo: 0.01,
      message: 'Demo remittance from Titan - testing email-native crypto transfers on Celo!',
    });

    res.status(201).json({
      success: true,
      message: 'Demo remittance created! Check drdeeks@outlook.com for claim email.',
      data: {
        remittanceId: result.remittanceId,
        claimToken: result.claimToken,
        txHash: result.txHash,
        expiresAt: new Date(result.expiresAt * 1000).toISOString(),
        claimUrl: `${process.env.BASE_URL}/api/remittance/claim/${result.claimToken}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/remittance/fee-quote — get fee breakdown before sending
router.get('/fee-quote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, chain, feeModel } = req.query;
    if (!amount) throw validationError('amount is required');

    const resolvedChain  = detectChain(undefined, chain as string) as SupportedChain;
    const resolvedFeeModel: FeeModel = feeModel === 'premium' ? 'premium' : 'standard';
    const amountNum = parseFloat(amount as string);

    const quote = await feeService.getFeeQuote(amountNum, resolvedChain, resolvedFeeModel);
    const description = feeService.getFeeModelDescription(resolvedFeeModel, resolvedChain);

    res.json({
      success: true,
      data: {
        ...quote,
        escrowPrivateKey: undefined, // never expose to client
        description,
        bothOptions: {
          standard: feeService.getFeeModelDescription('standard', resolvedChain),
          premium:  feeService.getFeeModelDescription('premium',  resolvedChain),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/remittance/status/:token — pre-claim info (no auth needed)
router.get('/status/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const remittance = await remittanceService.getRemittanceByToken(token);
    if (!remittance) {
      return res.status(404).json({ success: false, error: { message: 'Remittance not found or expired' } });
    }
    res.json({
      success: true,
      data: {
        amount_celo: remittance.amount_celo,
        currency: remittance.chain === 'base' ? 'ETH' : remittance.chain === 'monad' ? 'MON' : 'CELO',
        sender_email: remittance.sender_email,
        status: remittance.status,
        expires_at: new Date(remittance.expires_at * 1000).toISOString(),
        requireAuth: remittance.require_auth === 1,
        chain: remittance.chain || 'celo',
        selfVerified: remittance.self_verified === 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/remittance/verify/:token — mark as Self-verified after callback
router.post('/verify/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { verificationId } = req.body;

    if (!verificationId) {
      throw validationError('verificationId is required');
    }

    const result = remittanceService.verifyRemittance(token, verificationId);

    logger.info('Remittance verified via Self Protocol', { token, verificationId });

    res.json({
      success: true,
      data: result,
      message: 'Identity verification confirmed. You can now claim the remittance.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/remittance/recover/:id — re-send claim email for pending remittance
router.post('/recover/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await remittanceService.recoverRemittance(id);

    logger.info('Remittance recovered', { id, claimToken: result.claimToken });

    res.json({
      success: true,
      data: result,
      message: 'Recovery email sent successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ─── Bridge Routes ─────────────────────────────────────────────────────────────

// GET /api/remittance/bridge/routes — list supported bridge paths
router.get('/bridge/routes', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      routes: chainService.getSupportedBridgeRoutes(),
      chains: chainService.getSupportedChains(),
      note: 'Monad routes are testnet only. Celo↔Base routes are mainnet via LI.FI/Squid.',
    },
  });
});

// GET /api/remittance/bridge/quote — get a bridge quote
router.get('/bridge/quote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to, amount, toAddress } = req.query;

    if (!from || !to || !amount) {
      throw validationError('from, to, and amount are required');
    }

    const fromChain = detectChain(undefined, from as string) as SupportedChain;
    const toChain   = detectChain(undefined, to   as string) as SupportedChain;
    const walletAddr = toAddress as string || chainService.getWalletAddress(toChain);

    const quote = await chainService.getBridgeQuote(
      fromChain,
      toChain,
      parseFloat(amount as string),
      walletAddr
    );

    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
});

// POST /api/remittance/bridge — execute a bridge
router.post('/bridge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromChain, toChain, amount, toAddress } = req.body;

    if (!fromChain || !toChain || !amount) {
      throw validationError('fromChain, toChain, and amount are required');
    }

    const from = detectChain(undefined, fromChain) as SupportedChain;
    const to   = detectChain(undefined, toChain)   as SupportedChain;

    if (from === to) {
      throw validationError('fromChain and toChain must be different');
    }

    const targetAddr = toAddress || chainService.getWalletAddress(to);

    logger.info(`Bridge request: ${amount} ${from} → ${to} → ${targetAddr}`);

    const result = await chainService.executeBridge(from, to, parseFloat(amount), targetAddr);

    res.json({
      success: true,
      message: `Bridge initiated: ${from} → ${to}. Funds arrive in 2-5 minutes.`,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ─── Uniswap Routes (Agentic Finance Track) ────────────────────────────────────

// GET /api/remittance/uniswap/status
router.get('/uniswap/status', (req: Request, res: Response) => {
  res.json({ success: true, data: uniswapService.getStatus() });
});

// POST /api/remittance/uniswap/quote — get a Uniswap swap quote
router.post('/uniswap/quote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chain, tokenIn = 'NATIVE', tokenOut, amountIn } = req.body;
    if (!tokenOut || !amountIn) throw validationError('tokenOut and amountIn required');

    const resolvedChain = detectChain(undefined, chain || 'celo') as SupportedChain;
    const swapper = chainService.getWalletAddress(resolvedChain);

    const quote = await uniswapService.getSwapQuote({
      chain: resolvedChain,
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      swapper,
    });

    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
});

// POST /api/remittance/uniswap/swap — execute a Uniswap swap
router.post('/uniswap/swap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chain, tokenIn = 'NATIVE', tokenOut, amountIn, slippage } = req.body;
    if (!tokenOut || !amountIn) throw validationError('tokenOut and amountIn required');

    const resolvedChain = detectChain(undefined, chain || 'celo') as SupportedChain;

    const result = await uniswapService.executeSwap({
      chain: resolvedChain,
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      slippage: slippage ? parseFloat(slippage) : undefined,
    });

    logger.info('Uniswap swap executed', result);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

// POST /api/remittance/uniswap/bridge — cross-chain via Uniswap
router.post('/uniswap/bridge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromChain, toChain, amount } = req.body;
    if (!fromChain || !toChain || !amount) throw validationError('fromChain, toChain, amount required');

    const from = detectChain(undefined, fromChain) as SupportedChain;
    const to   = detectChain(undefined, toChain)   as SupportedChain;
    if (from === to) throw validationError('fromChain and toChain must differ');

    const quote = await uniswapService.getBridgeQuote(from, to, amount.toString());

    res.json({
      success: true,
      data: quote,
      note: 'Set UNISWAP_API_KEY in .env to execute this bridge. Quote shows estimated output.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export const transactionRoutes = router;

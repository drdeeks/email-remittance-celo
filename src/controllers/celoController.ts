import { Router, Request, Response, NextFunction } from 'express';
import { validationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { mandateService } from '../services/mandateService';
import { celoService } from '../services/celoService';

const router = Router();

// Get wallet balance
router.get('/balance/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;

    if (!address || !address.startsWith('0x') || address.length !== 42) {
      throw validationError('Invalid Celo address');
    }

    const balanceCelo = await celoService.getBalance(address);

    const balance = {
      address,
      nativeBalance: balanceCelo,
      nativeFormatted: `${balanceCelo} CELO`,
    };

    res.json({
      success: true,
      data: balance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction details
router.get('/tx/:txHash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { txHash } = req.params;

    if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
      throw validationError('Invalid transaction hash');
    }

    const receipt = await celoService.getTransactionReceipt(txHash);

    const tx = {
      hash: txHash,
      from: receipt.from,
      to: receipt.to,
      status: receipt.status,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
    };

    res.json({
      success: true,
      data: tx,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Transfer CELO directly
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, amount, reason } = req.body;

    if (!to || !to.startsWith('0x') || to.length !== 42) {
      throw validationError('Invalid recipient address');
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw validationError('Invalid amount');
    }

    // MANDATE POLICY CHECK - validate before transfer
    const transferReason = reason || `Direct send ${amount} CELO to ${to}`;
    const validation = await mandateService.validateTransfer({
      action: 'transfer',
      reason: transferReason,
      amount: parseFloat(amount) * 0.50, // Rough CELO to USD
      to,
    });

    if (!validation.allowed) {
      const message = mandateService.formatValidationMessage(validation, amount, 'CELO', to);
      logger.error(message);
      return res.status(403).json({
        success: false,
        error: {
          code: 'MANDATE_BLOCKED',
          message: message,
          blockReason: validation.blockReason,
        },
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(mandateService.formatValidationMessage(validation, amount, 'CELO', to));

    // Execute transfer
    const txHash = await celoService.sendCelo(to, parseFloat(amount));

    const transfer = {
      txHash,
      from: celoService.getWalletAddress(),
      to,
      amount,
      currency: 'CELO',
      status: 'confirmed',
      mandateIntentId: validation.intentId,
      explorerUrl: `https://explorer.celo.org/mainnet/tx/${txHash}`,
    };

    logger.info('Transfer completed', { txHash, to, amount });

    res.status(201).json({
      success: true,
      data: transfer,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get network info
router.get('/network', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const network = {
      name: 'Celo Mainnet',
      chainId: 42220,
      rpcUrl: process.env.CELO_RPC_URL || 'https://forno.celo.org',
      explorerUrl: 'https://explorer.celo.org/mainnet',
      serviceWallet: celoService.getWalletAddress(),
      blockTime: '~5 seconds',
    };

    res.json({
      success: true,
      data: network,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Generate new wallet (for recipients)
router.post('/wallet/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = celoService.generateClaimWallet();

    logger.info('Wallet generated', { address: wallet.address });

    res.status(201).json({
      success: true,
      data: {
        address: wallet.address,
        privateKey: wallet.privateKey,
        warning: 'SAVE YOUR PRIVATE KEY! This will only be shown once.',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export const celoRoutes = router;

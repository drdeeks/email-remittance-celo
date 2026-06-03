import { Request, Response } from 'express';
import { remittanceService } from '../services/remittanceService';
import { logger } from '../utils/logger';

export const createRemittance = async (req: Request, res: Response) => {
  try {
    const result = await remittanceService.createRemittance(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Failed to create remittance', { error });
    res.status(500).json({ error: 'Failed to create remittance' });
  }
};

export const claimRemittance = async (req: Request, res: Response) => {
  try {
    const { token, recipientWallet } = req.body;
    const result = await remittanceService.claimRemittance(token, recipientWallet);
    res.json(result);
  } catch (error) {
    logger.error('Failed to claim remittance', { error });
    res.status(500).json({ error: 'Failed to claim remittance' });
  }
};

export const getRemittanceStatus = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const status = await remittanceService.getRemittanceStatus(token);
    res.json(status);
  } catch (error) {
    logger.error('Failed to get remittance status', { error });
    res.status(500).json({ error: 'Failed to get remittance status' });
  }
};

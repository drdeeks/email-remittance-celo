import { Request, Response } from 'express';
import { selfContractService } from '../services/selfContract.service';
import { selfVerificationService } from '../services/selfVerification.service';
import { logger } from '../utils/logger';

export const initializeSelfProtocol = async (req: Request, res: Response) => {
  try {
    const { chain } = req.body;
    const result = await selfContractService.initialize(chain);
    res.json({ success: result });
  } catch (error) {
    logger.error('Failed to initialize Self Protocol', { error });
    res.status(500).json({ error: 'Failed to initialize Self Protocol' });
  }
};

export const getSelfStatus = async (req: Request, res: Response) => {
  try {
    const status = selfVerificationService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get Self status', { error });
    res.status(500).json({ error: 'Failed to get Self status' });
  }
};

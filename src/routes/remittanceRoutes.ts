import { Router } from 'express';
import { createRemittance, claimRemittance, getRemittanceStatus } from '../controllers/remittanceController';
import { validateRemittance } from '../middleware/validationMiddleware';
import { remittanceService } from '../services/remittanceService';

const router = Router();

router.post('/', validateRemittance, createRemittance);
router.post('/claim', claimRemittance);
router.get('/status/:token', getRemittanceStatus);
router.post('/process-expired', async (req, res) => {
  try {
    await remittanceService.handleExpiredRemittances();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as remittanceRoutes };

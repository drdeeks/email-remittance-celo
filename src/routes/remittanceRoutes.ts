import { Router } from 'express';
import { handleExpiredRemittances } from '../services/remittanceService';

const router = Router();

// Process expired remittances — deducts 1.5% storage fee, returns remainder to sender
router.post('/process-expired', async (req, res) => {
  try {
    const result = await handleExpiredRemittances();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as remittanceRoutes };

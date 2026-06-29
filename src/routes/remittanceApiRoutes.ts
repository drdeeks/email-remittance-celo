import { Router } from 'express';
import { remittanceRoutes } from '../controllers/remittanceController';

const router = Router();

router.use('/remittances', remittanceRoutes);

export { router as remittanceApiRoutes };
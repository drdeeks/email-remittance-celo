import { Router } from 'express';
import { selectVerificationMethod, getVerificationStatus, selfEnterpriseWebhook } from '../controllers/verificationController';

const router = Router();

// SCR-1: User verification method selector - NONE, SELF, OR WORLDID
router.post('/select', selectVerificationMethod);

// Unified enterprise verification endpoint
router.post('/', selectVerificationMethod);
router.get('/status/:token', getVerificationStatus);

// Self Enterprise webhook endpoint
router.post('/webhooks/self', selfEnterpriseWebhook);

export { router as verificationRoutes };

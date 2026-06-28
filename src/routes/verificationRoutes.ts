import { Router } from 'express';
import { selectVerificationMethod, getVerificationStatus } from '../controllers/verificationController';

const router = Router();

// SCR-1: User verification method selector - NONE, SELF, OR WORLDID
router.post('/select', selectVerificationMethod);

// Unified enterprise verification endpoint
router.post('/', selectVerificationMethod);
router.get('/status/:token', getVerificationStatus);

export { router as verificationRoutes };

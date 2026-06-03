import { Router } from 'express';
import { verifyIdentity, getVerificationStatus } from '../controllers/verificationController';

const router = Router();

router.post('/', verifyIdentity);
router.get('/status/:token', getVerificationStatus);

export { router as verificationRoutes };

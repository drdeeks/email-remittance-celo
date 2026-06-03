import { Router } from 'express';
import { selfVerificationService } from '../services/selfVerification.service';

const router = Router();

router.get('/', (req, res) => {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    selfProtocol: selfVerificationService.getStatus()
  };
  res.json(status);
});

export { router as healthRoutes };

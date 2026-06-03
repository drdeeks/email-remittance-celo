import { Router } from 'express';
import { initializeSelfProtocol, getSelfStatus } from '../controllers/selfController';
import { selfVerificationService } from '../services/selfVerification.service';

const router = Router();

// Contract initialization
router.post('/initialize', initializeSelfProtocol);

// System status
router.get('/status', getSelfStatus);

// Frontend configuration
router.get('/config', (req, res) => {
  // Provide a default userId for the frontend config
  const userId = typeof req.query.userId === 'string' ? req.query.userId : 'default-user';
  res.json(selfVerificationService.getFrontendConfig(userId));
});

// Proof verification
router.post('/verify-proof', async (req, res) => {
  try {
    const { attestationId, proof, pubSignals, userContextData } = req.body;
    // Validate required parameters
    if (attestationId === undefined || proof === undefined || 
        pubSignals === undefined || userContextData === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Convert pubSignals to array if it's not already
    const pubSignalsArray = Array.isArray(pubSignals) ? pubSignals : [pubSignals];
    const result = await selfVerificationService.verifyProof(
      Number(attestationId), 
      proof, 
      pubSignalsArray, 
      userContextData
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify proof' });
  }
});

export { router as selfRoutes };

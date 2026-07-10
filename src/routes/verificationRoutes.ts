import { Router } from 'express';
import crypto from 'crypto';
import { selectVerificationMethod, getVerificationStatus, selfEnterpriseWebhook, verifyWorldId } from '../controllers/verificationController';
import { selfVerificationService } from '../services/selfVerification.service';

const router = Router();

// Server-decided verification method for the funding entity (client choice is ignored).
router.post('/select', selectVerificationMethod);

// Unified endpoint — returns the server-decided method.
router.post('/', selectVerificationMethod);
router.get('/status/:token', getVerificationStatus);

// Real World ID proof verification.
router.post('/worldid/verify', verifyWorldId);

// Self Enterprise webhook endpoint (Svix signature verified in the handler).
router.post('/webhooks/self', selfEnterpriseWebhook);

// Self proof submission callback (legacy @selfxyz/core path; enterprise uses the webhook above).
router.post('/claim-callback', async (req, res) => {
  try {
    const { attestationId, proof, pubSignals, userContextData } = req.body;
    if (attestationId === undefined || proof === undefined ||
        pubSignals === undefined || userContextData === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const pubSignalsArray = Array.isArray(pubSignals) ? pubSignals : [pubSignals];
    const result = await selfVerificationService.verifyProof(
      Number(attestationId), proof, pubSignalsArray, userContextData
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify proof' });
  }
});

// World ID v4 rp_context for the IDKit widget (best-effort signed context; falls back to empty if no secret).
router.get('/worldid/rp-context', (req, res) => {
  const secret = process.env.WORLDID_APP_SECRET;
  const rpId = process.env.WORLDID_APP_ID || 'app_staging';
  if (!secret) {
    return res.json({ rp_context: { rp_id: rpId, nonce: '', created_at: '', expires_at: '', signature: '' } });
  }
  const nonce = crypto.randomBytes(16).toString('hex');
  const created_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + 3600 * 1000).toISOString();
  const payload = `${rpId}:${nonce}:${created_at}:${expires_at}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  res.json({ rp_context: { rp_id: rpId, nonce, created_at, expires_at, signature } });
});

export { router as verificationRoutes };

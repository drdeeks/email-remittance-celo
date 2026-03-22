import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'email-native-remittance',
  });
});

router.get('/ready', (req: Request, res: Response) => {
  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

router.get('/live', (req: Request, res: Response) => {
  res.json({
    live: true,
    timestamp: new Date().toISOString(),
  });
});

export const healthRoutes = router;

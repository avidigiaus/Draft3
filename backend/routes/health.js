import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'digital-it-move-resume',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;

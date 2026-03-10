import { Router } from 'express';

const router = Router();

// Health check endpoint for Cloud Run (no auth required)
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;

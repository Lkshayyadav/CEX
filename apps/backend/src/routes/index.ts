import { Router } from 'express';

const router = Router();

/**
 * GET /api/v1/health
 * Production-ready health check endpoint.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CEX Backend is running',
  });
});

export default router;

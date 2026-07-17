import { Router } from 'express';
import authRoutes from './auth.routes';

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

// Mount authentication sub-routes
router.use('/auth', authRoutes);

export default router;

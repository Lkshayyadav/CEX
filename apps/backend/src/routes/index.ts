import { Router } from 'express';
import authRoutes from './auth.routes';
import marketRoutes from './market.routes';
import balanceRoutes from './balance.routes';

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

// Mount market sub-routes (assets and markets)
router.use('/', marketRoutes);

// Mount balance sub-routes
router.use('/balances', balanceRoutes);

export default router;

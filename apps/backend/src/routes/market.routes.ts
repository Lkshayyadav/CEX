import { Router } from 'express';
import { marketController } from '../controllers';
import { validateRequestParams } from '../validators';
import { getMarketBySymbolSchema } from '../validators/market.validator';

const router = Router();

/**
 * GET /api/v1/assets
 * Returns all active assets.
 */
router.get('/assets', marketController.getAssets);

/**
 * GET /api/v1/markets
 * Returns all active markets with base and quote asset information.
 */
router.get('/markets', marketController.getMarkets);

/**
 * GET /api/v1/markets/:symbol
 * Returns detailed information for a specific market.
 */
router.get('/markets/:symbol', validateRequestParams(getMarketBySymbolSchema), marketController.getMarketBySymbol);

export default router;

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

/**
 * GET /api/v1/markets/:symbol/depth
 * Returns the current order book depth snapshot from Redis.
 */
router.get('/markets/:symbol/depth', validateRequestParams(getMarketBySymbolSchema), marketController.getMarketDepth);

/**
 * GET /api/v1/markets/:symbol/candles
 * Returns aggregated kline/candlestick data for a market.
 */
router.get('/markets/:symbol/candles', validateRequestParams(getMarketBySymbolSchema), marketController.getMarketCandles);

/**
 * GET /api/v1/markets/:symbol/trades
 * Returns recent trade fills for a market.
 */
router.get('/markets/:symbol/trades', validateRequestParams(getMarketBySymbolSchema), marketController.getMarketTrades);

/**
 * GET /api/v1/markets/:symbol/stats
 * Returns 24h ticker statistics for a market.
 */
router.get('/markets/:symbol/stats', validateRequestParams(getMarketBySymbolSchema), marketController.getMarketStats);

export default router;


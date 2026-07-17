import { Request, Response, NextFunction } from 'express';
import { marketService } from '../services';
import { sendSuccessResponse } from '../utils';
import { HTTP_STATUS } from '../constants';

/**
 * Market Controller
 * Orchestrates incoming HTTP requests for Assets and Markets.
 */
export const marketController = {
  /**
   * GET /api/v1/assets
   * Returns all active assets.
   */
  async getAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await marketService.getAssets();
      sendSuccessResponse(res, data, 'Assets retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/markets
   * Returns all active markets with base and quote asset information.
   */
  async getMarkets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await marketService.getMarkets();
      sendSuccessResponse(res, data, 'Markets retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/markets/:symbol
   * Returns detailed information for a specific market.
   */
  async getMarketBySymbol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { symbol } = req.params;
      const data = await marketService.getMarketBySymbol(symbol);
      sendSuccessResponse(res, data, 'Market details retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/markets/:symbol/depth
   * Returns the current order book depth snapshot from Redis.
   */
  async getMarketDepth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { symbol } = req.params;
      const data = await marketService.getMarketDepth(symbol);
      sendSuccessResponse(res, data, 'Market depth snapshot retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/markets/:symbol/candles
   * Returns aggregated kline/candlestick data for a market.
   */
  async getMarketCandles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { symbol } = req.params;
      const { interval } = req.query;
      const data = await marketService.getMarketCandles(symbol, interval as string);
      sendSuccessResponse(res, data, 'Market candles retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/markets/:symbol/trades
   * Returns recent trade fills for a market.
   */
  async getMarketTrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { symbol } = req.params;
      const data = await marketService.getMarketTrades(symbol);
      sendSuccessResponse(res, data, 'Market trades retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/markets/:symbol/stats
   * Returns 24h ticker statistics for a market.
   */
  async getMarketStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { symbol } = req.params;
      const data = await marketService.getMarketStats(symbol);
      sendSuccessResponse(res, data, 'Market stats retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },
};


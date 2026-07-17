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
};

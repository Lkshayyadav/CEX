import { Request, Response, NextFunction } from 'express';
import { balanceService } from '../services';
import { sendSuccessResponse, AppError } from '../utils';
import { HTTP_STATUS } from '../constants';

/**
 * Balance Controller
 * Handles user ledger requests, delegating to the Balance Service.
 */
export const balanceController = {
  /**
   * GET /api/v1/balances
   * Returns all balances for the authenticated user.
   */
  async getBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Access unauthorized. Please login first.', HTTP_STATUS.UNAUTHORIZED);
      }
      const data = await balanceService.getUserBalances(req.user.id);
      sendSuccessResponse(res, data, 'Balances retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/balances/:asset
   * Returns the balance for one asset.
   */
  async getBalanceByAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Access unauthorized. Please login first.', HTTP_STATUS.UNAUTHORIZED);
      }
      const { asset } = req.params;
      const data = await balanceService.getUserBalanceByAsset(req.user.id, asset);
      sendSuccessResponse(res, data, 'Asset balance retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/balances/deposit
   * Simulates a deposit of funds into a user's account.
   */
  async deposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Access unauthorized. Please login first.', HTTP_STATUS.UNAUTHORIZED);
      }
      const { assetSymbol, amount } = req.body;
      const data = await balanceService.deposit(req.user.id, { assetSymbol, amount });
      sendSuccessResponse(res, data, 'Deposit successful', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },
};

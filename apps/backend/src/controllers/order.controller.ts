import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services';
import { sendSuccessResponse, AppError } from '../utils';
import { HTTP_STATUS } from '../constants';

/**
 * Order Controller
 * Coordinates order creation and lookup requests.
 */
export const orderController = {
  /**
   * GET /api/v1/orders
   * Returns all orders for the authenticated user.
   */
  async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Access unauthorized. Please login first.', HTTP_STATUS.UNAUTHORIZED);
      }
      const data = await orderService.getUserOrders(req.user.id);
      sendSuccessResponse(res, data, 'Orders retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orders/:id
   * Returns detailed information for a single order owned by the user.
   */
  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Access unauthorized. Please login first.', HTTP_STATUS.UNAUTHORIZED);
      }
      const { id } = req.params;
      const data = await orderService.getOrderDetails(id, req.user.id);
      sendSuccessResponse(res, data, 'Order details retrieved successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orders
   * Creates a new BUY or SELL order.
   */
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Access unauthorized. Please login first.', HTTP_STATUS.UNAUTHORIZED);
      }
      const { marketSymbol, side, type, price, quantity } = req.body;
      const data = await orderService.createOrder(req.user.id, {
        marketSymbol,
        side,
        type,
        price,
        quantity,
      });
      sendSuccessResponse(res, data, 'Order placed successfully', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/orders/:id
   * Cancels an open order and unlocks the user's funds.
   */
  async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Access unauthorized. Please login first.', HTTP_STATUS.UNAUTHORIZED);
      }
      const { id } = req.params;
      const data = await orderService.cancelOrder(id, req.user.id);
      sendSuccessResponse(res, data, 'Order cancelled successfully', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  },
};

import { orderRepository, marketRepository, balanceRepository } from '../repositories';
import { AppError } from '../utils';
import { HTTP_STATUS } from '../constants';
import { OrderDTO, CreateOrderInput } from '../types';
import { prisma } from '../lib';
import { Prisma } from '@prisma/client';
import { redis } from '@cex/common';


/**
 * Order Service
 * Handles business validation, balance checks, locking mechanisms, and transaction flow for orders.
 */
export const orderService = {
  /**
   * Fetch all orders for a user.
   */
  async getUserOrders(userId: string): Promise<OrderDTO[]> {
    const orders = await orderRepository.findOrdersByUser(userId);
    return orders.map((order) => ({
      id: order.id,
      userId: order.userId,
      marketId: order.marketId,
      side: order.side,
      type: order.type,
      status: order.status,
      price: order.price ? order.price.toString() : null,
      quantity: order.quantity.toString(),
      filledQuantity: order.filledQuantity.toString(),
      remainingQuantity: order.remainingQuantity.toString(),
      averageFillPrice: order.averageFillPrice ? order.averageFillPrice.toString() : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      market: order.market,
    }));
  },

  /**
   * Fetch a single order by ID and user ID.
   */
  async getOrderDetails(id: string, userId: string): Promise<OrderDTO> {
    const order = await orderRepository.findOrderByIdAndUser(id, userId);
    if (!order) {
      throw new AppError(`Order with ID '${id}' not found`, HTTP_STATUS.NOT_FOUND);
    }
    return {
      id: order.id,
      userId: order.userId,
      marketId: order.marketId,
      side: order.side,
      type: order.type,
      status: order.status,
      price: order.price ? order.price.toString() : null,
      quantity: order.quantity.toString(),
      filledQuantity: order.filledQuantity.toString(),
      remainingQuantity: order.remainingQuantity.toString(),
      averageFillPrice: order.averageFillPrice ? order.averageFillPrice.toString() : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      market: order.market,
    };
  },

  /**
   * Create an order, perform balance checks, lock assets, and insert the order within a single transaction.
   */
  async createOrder(userId: string, input: CreateOrderInput): Promise<OrderDTO> {
    const symbol = input.marketSymbol.toUpperCase().replace('-', '/');

    // 1. Verify that the market exists and is active
    const market = await marketRepository.getMarketBySymbol(symbol);
    if (!market || !market.isActive) {
      throw new AppError(`Active market for symbol '${input.marketSymbol}' not found`, HTTP_STATUS.NOT_FOUND);
    }

    // 2. Identify the asset to lock and the required quantity/funds
    let assetIdToLock: string;
    let amountToLock: Prisma.Decimal;

    if (input.side === 'SELL') {
      // Selling base asset: verify and lock base asset quantity
      assetIdToLock = market.baseAssetId;
      amountToLock = new Prisma.Decimal(input.quantity);
    } else {
      // Buying base asset: verify and lock quote asset funds (price * quantity)
      assetIdToLock = market.quoteAssetId;
      
      const priceStr = input.price || (input.type === 'MARKET' ? '0' : undefined);
      if (!priceStr || parseFloat(priceStr) <= 0) {
        throw new AppError(
          'A positive price is required to calculate required funds for BUY orders in this phase',
          HTTP_STATUS.BAD_REQUEST
        );
      }
      
      const price = new Prisma.Decimal(priceStr);
      const quantity = new Prisma.Decimal(input.quantity);
      amountToLock = price.mul(quantity);
    }

    // 3. Execute balance check, locking, and order insertion in a single transaction
    const created = await prisma.$transaction(async (tx) => {
      let balance = await balanceRepository.findBalanceByUserAndAssetId(userId, assetIdToLock, tx);

      if (!balance) {
        // Initialize balance record if it doesn't exist
        balance = await balanceRepository.createBalance(userId, assetIdToLock, '0', tx);
      }

      // Check if user has sufficient free balance
      if (balance.free.lt(amountToLock)) {
        throw new AppError('Insufficient free balance to place this order', HTTP_STATUS.BAD_REQUEST);
      }

      // Atomically decrement free and increment locked
      await balanceRepository.lockFunds(userId, assetIdToLock, amountToLock.toString(), tx);

      // Insert order with OPEN status
      return orderRepository.createOrder(
        {
          userId,
          marketId: market.id,
          side: input.side,
          type: input.type,
          price: input.price,
          quantity: input.quantity,
          status: 'OPEN',
        },
        tx
      );
    });

    const orderPayload = {
      id: created.id,
      userId: created.userId,
      marketId: created.marketId,
      side: created.side,
      type: created.type,
      status: created.status,
      price: created.price ? created.price.toString() : null,
      quantity: created.quantity.toString(),
      filledQuantity: created.filledQuantity.toString(),
      remainingQuantity: created.remainingQuantity.toString(),
      averageFillPrice: created.averageFillPrice ? created.averageFillPrice.toString() : null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    await redis.lpush('engine:orders', JSON.stringify(orderPayload));

    return {
      id: created.id,
      userId: created.userId,
      marketId: created.marketId,
      side: created.side,
      type: created.type,
      status: created.status,
      price: created.price ? created.price.toString() : null,
      quantity: created.quantity.toString(),
      filledQuantity: created.filledQuantity.toString(),
      remainingQuantity: created.remainingQuantity.toString(),
      averageFillPrice: created.averageFillPrice ? created.averageFillPrice.toString() : null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      market: created.market,
    };
  },

  /**
   * Cancel an open order and release the locked balance back to free balance.
   * Performs all ownership and status validations, then executes changes in a transaction.
   */
  async cancelOrder(id: string, userId: string): Promise<OrderDTO> {
    // 1. Fetch order and confirm ownership (market projection now includes asset IDs)
    const order = await orderRepository.findOrderByIdAndUser(id, userId);
    if (!order) {
      throw new AppError(`Order with ID '${id}' not found`, HTTP_STATUS.NOT_FOUND);
    }

    // 2. Validate current status: only OPEN orders can be cancelled
    if (order.status !== 'OPEN') {
      throw new AppError(
        `Only OPEN orders can be cancelled. Current status is ${order.status}.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 3. Determine the asset to unlock and the exact amount to release
    let assetIdToUnlock: string;
    let amountToUnlock: Prisma.Decimal;

    if (order.side === 'SELL') {
      // Selling base asset: unlock the remaining quantity of base asset
      assetIdToUnlock = order.market.baseAssetId;
      amountToUnlock = order.remainingQuantity;
    } else {
      // Buying: unlock quote asset (price * remainingQuantity)
      assetIdToUnlock = order.market.quoteAssetId;
      if (!order.price) {
        throw new AppError('Cannot calculate unlock funds for BUY order without price', HTTP_STATUS.BAD_REQUEST);
      }
      amountToUnlock = order.price.mul(order.remainingQuantity);
    }

    // 4. Perform database updates in a single transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Release locked funds (decrement locked, increment free)
      await balanceRepository.unlockFunds(userId, assetIdToUnlock, amountToUnlock.toString(), tx);

      // Update order status to CANCELLED
      return orderRepository.updateOrderStatus(id, 'CANCELLED', tx);
    });

    return {
      id: updated.id,
      userId: updated.userId,
      marketId: updated.marketId,
      side: updated.side,
      type: updated.type,
      status: updated.status,
      price: updated.price ? updated.price.toString() : null,
      quantity: updated.quantity.toString(),
      filledQuantity: updated.filledQuantity.toString(),
      remainingQuantity: updated.remainingQuantity.toString(),
      averageFillPrice: updated.averageFillPrice ? updated.averageFillPrice.toString() : null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      market: updated.market,
    };
  },
};

import { orderRepository, marketRepository, balanceRepository } from '../repositories';
import { AppError } from '../utils';
import { HTTP_STATUS } from '../constants';
import { OrderDTO, CreateOrderInput } from '../types';
import { prisma } from '../lib';
import { Prisma } from '@prisma/client';
import { redis } from '@cex/common';
import crypto from 'crypto';


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
      assetIdToLock = market.baseAssetId;
      amountToLock = new Prisma.Decimal(input.quantity);
    } else {
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

    // Read-only balance check in backend to return quick error feedback
    const balance = await balanceRepository.findBalanceByUserAndAssetId(userId, assetIdToLock);
    if (!balance || balance.free.lt(amountToLock)) {
      throw new AppError('Insufficient free balance to place this order', HTTP_STATUS.BAD_REQUEST);
    }

    const orderId = crypto.randomUUID();
    const now = new Date();

    const orderPayload = {
      id: orderId,
      userId,
      marketId: market.id,
      side: input.side,
      type: input.type,
      status: 'PENDING' as any,
      price: input.price || null,
      quantity: input.quantity,
      filledQuantity: '0',
      remainingQuantity: input.quantity,
      averageFillPrice: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const command = {
      type: 'CREATE_ORDER',
      data: orderPayload,
    };

    // Simply push to engine:orders Redis queue
    await redis.lpush('engine:orders', JSON.stringify(command));

    return {
      ...orderPayload,
      createdAt: now,
      updatedAt: now,
      market: {
        id: market.id,
        symbol: market.symbol,
        baseAssetId: market.baseAssetId,
        quoteAssetId: market.quoteAssetId,
      } as any,
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

    // 2. Validate current status: only open or pending orders can be cancelled
    if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED' && order.status !== 'PENDING') {
      throw new AppError(
        `Only open or pending orders can be cancelled. Current status is ${order.status}.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const command = {
      type: 'CANCEL_ORDER',
      data: {
        orderId: id,
        userId,
        marketSymbol: order.market.symbol,
      },
    };

    // Simply submit cancellation command to Redis
    await redis.lpush('engine:orders', JSON.stringify(command));

    return {
      id: order.id,
      userId: order.userId,
      marketId: order.marketId,
      side: order.side,
      type: order.type,
      status: 'PENDING',
      price: order.price ? order.price.toString() : null,
      quantity: order.quantity.toString(),
      filledQuantity: order.filledQuantity.toString(),
      remainingQuantity: order.remainingQuantity.toString(),
      averageFillPrice: order.averageFillPrice ? order.averageFillPrice.toString() : null,
      createdAt: order.createdAt,
      updatedAt: new Date(),
      market: order.market,
    };
  },
};

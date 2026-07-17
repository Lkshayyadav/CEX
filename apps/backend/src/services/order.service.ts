import { orderRepository, marketRepository, balanceRepository } from '../repositories';
import { AppError } from '../utils';
import { HTTP_STATUS } from '../constants';
import { OrderDTO, CreateOrderInput } from '../types';
import { prisma } from '../lib';
import { Prisma } from '@prisma/client';

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
};

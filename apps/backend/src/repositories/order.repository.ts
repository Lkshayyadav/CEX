import { prisma } from '../lib';
import { Prisma, OrderSide, OrderType, OrderStatus } from '@prisma/client';

/**
 * Order Repository
 * Handles direct database operations for the Order model.
 */
export const orderRepository = {
  /**
   * Fetch all orders for a specific user.
   */
  async findOrdersByUser(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        marketId: true,
        side: true,
        type: true,
        status: true,
        price: true,
        quantity: true,
        filledQuantity: true,
        remainingQuantity: true,
        averageFillPrice: true,
        createdAt: true,
        updatedAt: true,
        market: {
          select: {
            id: true,
            symbol: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Fetch a single order by ID and user ID.
   */
  async findOrderByIdAndUser(id: string, userId: string) {
    return prisma.order.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        userId: true,
        marketId: true,
        side: true,
        type: true,
        status: true,
        price: true,
        quantity: true,
        filledQuantity: true,
        remainingQuantity: true,
        averageFillPrice: true,
        createdAt: true,
        updatedAt: true,
        market: {
          select: {
            id: true,
            symbol: true,
          },
        },
      },
    });
  },

  /**
   * Create a new order record.
   */
  async createOrder(
    data: {
      userId: string;
      marketId: string;
      side: OrderSide;
      type: OrderType;
      price?: string;
      quantity: string;
      status?: OrderStatus;
    },
    tx?: any
  ) {
    const client = tx || prisma;
    return client.order.create({
      data: {
        userId: data.userId,
        marketId: data.marketId,
        side: data.side,
        type: data.type,
        price: data.price ? new Prisma.Decimal(data.price) : null,
        quantity: new Prisma.Decimal(data.quantity),
        remainingQuantity: new Prisma.Decimal(data.quantity),
        filledQuantity: new Prisma.Decimal('0'),
        status: data.status || 'OPEN',
      },
      select: {
        id: true,
        userId: true,
        marketId: true,
        side: true,
        type: true,
        status: true,
        price: true,
        quantity: true,
        filledQuantity: true,
        remainingQuantity: true,
        averageFillPrice: true,
        createdAt: true,
        updatedAt: true,
        market: {
          select: {
            id: true,
            symbol: true,
          },
        },
      },
    });
  },
};

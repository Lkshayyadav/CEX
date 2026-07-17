import { prisma } from '../lib';
import { Prisma } from '@prisma/client';

/**
 * Balance Repository
 * Manages database persistence, reads, and updates for the Balance model.
 */
export const balanceRepository = {
  /**
   * Find all balances for a specific user.
   */
  async findBalancesByUser(userId: string) {
    return prisma.balance.findMany({
      where: { userId },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true,
          },
        },
      },
      orderBy: {
        asset: {
          symbol: 'asc',
        },
      },
    });
  },

  /**
   * Find a specific user balance by user ID and asset ID.
   */
  async findBalanceByUserAndAssetId(userId: string, assetId: string, tx?: any) {
    const client = tx || prisma;
    return client.balance.findUnique({
      where: {
        userId_assetId: {
          userId,
          assetId,
        },
      },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true,
          },
        },
      },
    });
  },

  /**
   * Find a specific user balance by user ID and asset symbol (e.g. "BTC").
   */
  async findBalanceByUserAndAssetSymbol(userId: string, symbol: string) {
    return prisma.balance.findFirst({
      where: {
        userId,
        asset: {
          symbol: {
            equals: symbol,
            mode: 'insensitive',
          },
        },
      },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true,
          },
        },
      },
    });
  },

  /**
   * Create a new balance record for a user and asset.
   */
  async createBalance(userId: string, assetId: string, initialFree = '0', tx?: any) {
    const client = tx || prisma;
    return client.balance.create({
      data: {
        userId,
        assetId,
        free: new Prisma.Decimal(initialFree),
        locked: new Prisma.Decimal('0'),
      },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true,
          },
        },
      },
    });
  },

  /**
   * Increment the free balance of a user's asset.
   */
  async incrementFreeBalance(userId: string, assetId: string, amount: string, tx?: any) {
    const client = tx || prisma;
    return client.balance.update({
      where: {
        userId_assetId: {
          userId,
          assetId,
        },
      },
      data: {
        free: {
          increment: new Prisma.Decimal(amount),
        },
      },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true,
          },
        },
      },
    });
  },

  /**
   * Lock funds: atomically decrements free balance and increments locked balance.
   */
  async lockFunds(userId: string, assetId: string, amount: string, tx?: any) {
    const client = tx || prisma;
    return client.balance.update({
      where: {
        userId_assetId: {
          userId,
          assetId,
        },
      },
      data: {
        free: {
          decrement: new Prisma.Decimal(amount),
        },
        locked: {
          increment: new Prisma.Decimal(amount),
        },
      },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true,
          },
        },
      },
    });
  },
};

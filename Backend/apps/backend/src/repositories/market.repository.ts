import { prisma } from '../lib';

/**
 * Market Repository
 * Implements database queries for Asset and Market entities.
 */
export const marketRepository = {
  /**
   * Fetch all active assets from the database.
   */
  async getActiveAssets() {
    return prisma.asset.findMany({
      where: { isActive: true },
      select: {
        id: true,
        symbol: true,
        name: true,
        decimals: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { symbol: 'asc' },
    });
  },

  /**
   * Fetch an asset by its symbol (e.g. "BTC").
   */
  async getAssetBySymbol(symbol: string) {
    return prisma.asset.findUnique({
      where: { symbol },
    });
  },

  /**
   * Fetch all active markets including their base and quote asset details.
   */
  async getActiveMarkets() {
    return prisma.market.findMany({
      where: { isActive: true },
      select: {
        id: true,
        symbol: true,
        baseAssetId: true,
        quoteAssetId: true,
        minOrderSize: true,
        maxOrderSize: true,
        tickSize: true,
        stepSize: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        baseAsset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true,
          },
        },
        quoteAsset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true,
          },
        },
      },
      orderBy: { symbol: 'asc' },
    });
  },

  /**
   * Fetch a market by its symbol (e.g. "BTC/USDT") including its base and quote asset details.
   */
  async getMarketBySymbol(symbol: string) {
    return prisma.market.findUnique({
      where: { symbol },
      select: {
        id: true,
        symbol: true,
        baseAssetId: true,
        quoteAssetId: true,
        minOrderSize: true,
        maxOrderSize: true,
        tickSize: true,
        stepSize: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        baseAsset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true,
          },
        },
        quoteAsset: {
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
   * Fetch all fills for a specific market sorted by creation time.
   */
  async getMarketFills(marketId: string) {
    return prisma.fill.findMany({
      where: { marketId },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * Fetch recent fills for a specific market with their taker side.
   */
  async getMarketTrades(marketId: string) {
    return prisma.fill.findMany({
      where: { marketId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        takerOrder: {
          select: {
            side: true,
          },
        },
      },
    });
  },

  /**
   * Fetch fills for a specific market since a given date.
   */
  async getMarketFillsSince(marketId: string, since: Date) {
    return prisma.fill.findMany({
      where: {
        marketId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * Fetch the last fill for a specific market.
   */
  async getLastMarketFill(marketId: string) {
    return prisma.fill.findFirst({
      where: { marketId },
      orderBy: { createdAt: 'desc' },
    });
  },
};


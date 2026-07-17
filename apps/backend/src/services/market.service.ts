import { marketRepository } from '../repositories';
import { AppError } from '../utils';
import { HTTP_STATUS } from '../constants';
import { AssetDTO, MarketDTO } from '../types';
import { redis } from '@cex/common';

/**
 * Market Service
 * Handles business logic, entity mapping, and validation for assets and markets.
 */
export const marketService = {
  /**
   * Get all active assets.
   */
  async getAssets(): Promise<AssetDTO[]> {
    const assets = await marketRepository.getActiveAssets();
    return assets.map((asset) => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      isActive: asset.isActive,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    }));
  },

  /**
   * Get all active markets with base and quote asset information.
   */
  async getMarkets(): Promise<MarketDTO[]> {
    const markets = await marketRepository.getActiveMarkets();
    return markets.map((market) => ({
      id: market.id,
      symbol: market.symbol,
      baseAssetId: market.baseAssetId,
      quoteAssetId: market.quoteAssetId,
      minOrderSize: market.minOrderSize.toString(),
      maxOrderSize: market.maxOrderSize.toString(),
      tickSize: market.tickSize.toString(),
      stepSize: market.stepSize.toString(),
      isActive: market.isActive,
      createdAt: market.createdAt,
      updatedAt: market.updatedAt,
      baseAsset: market.baseAsset,
      quoteAsset: market.quoteAsset,
    }));
  },

  /**
   * Get detailed information for a specific market by symbol.
   * Throws 404 AppError if not found.
   */
  async getMarketBySymbol(symbol: string): Promise<MarketDTO> {
    // Standardize symbol query parameter (e.g. BTC-USDT to BTC/USDT or simply matching uppercase)
    // The symbol in database is seeded like "BTC/USDT"
    const uppercaseSymbol = symbol.toUpperCase().replace('-', '/');
    const market = await marketRepository.getMarketBySymbol(uppercaseSymbol);

    if (!market) {
      throw new AppError(`Market with symbol '${symbol}' not found`, HTTP_STATUS.NOT_FOUND);
    }

    return {
      id: market.id,
      symbol: market.symbol,
      baseAssetId: market.baseAssetId,
      quoteAssetId: market.quoteAssetId,
      minOrderSize: market.minOrderSize.toString(),
      maxOrderSize: market.maxOrderSize.toString(),
      tickSize: market.tickSize.toString(),
      stepSize: market.stepSize.toString(),
      isActive: market.isActive,
      createdAt: market.createdAt,
      updatedAt: market.updatedAt,
      baseAsset: market.baseAsset,
      quoteAsset: market.quoteAsset,
    };
  },

  /**
   * Get the current order book depth snapshot for a market from Redis.
   */
  async getMarketDepth(symbol: string): Promise<any> {
    const uppercaseSymbol = symbol.toUpperCase().replace('-', '/');
    const market = await marketRepository.getMarketBySymbol(uppercaseSymbol);

    if (!market) {
      throw new AppError(`Market with symbol '${symbol}' not found`, HTTP_STATUS.NOT_FOUND);
    }

    const channelSymbol = uppercaseSymbol.replace('/', '_');
    const snapshotStr = await redis.get(`market:${channelSymbol}:depth:snapshot`);

    if (snapshotStr) {
      return JSON.parse(snapshotStr);
    }

    // Return empty depth if no snapshot exists yet
    return {
      symbol: uppercaseSymbol,
      bids: [],
      asks: [],
      timestamp: new Date().getTime(),
    };
  },

  /**
   * Get historical aggregated candlestick data for a market.
   */
  async getMarketCandles(symbol: string, intervalStr: string = '1m'): Promise<any[]> {
    const uppercaseSymbol = symbol.toUpperCase().replace('-', '/');
    const market = await marketRepository.getMarketBySymbol(uppercaseSymbol);

    if (!market) {
      throw new AppError(`Market with symbol '${symbol}' not found`, HTTP_STATUS.NOT_FOUND);
    }

    let stepSec = 60;
    const cleanInterval = (intervalStr || '1m').toLowerCase();
    if (cleanInterval === '15m') {
      stepSec = 15 * 60;
    } else if (cleanInterval === '1h') {
      stepSec = 60 * 60;
    } else if (cleanInterval === '1d') {
      stepSec = 24 * 60 * 60;
    }

    const fills = await marketRepository.getMarketFills(market.id);
    const candles: any[] = [];
    if (fills.length === 0) {
      return candles;
    }

    // Sort fills ascending by time
    const sortedFills = [...fills].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const nowSec = Math.floor(Date.now() / 1000);
    const maxCandlesLimit = 1000;
    const maxLookbackSec = maxCandlesLimit * stepSec;
    const limitStartSec = nowSec - maxLookbackSec;

    // Filter fills to the lookback window
    const relevantFills = sortedFills.filter(
      (f) => Math.floor(f.createdAt.getTime() / 1000) >= limitStartSec
    );

    let currentBucketTime: number;
    let lastClosePrice: number;
    let fillIdx = 0;

    if (relevantFills.length > 0) {
      const firstFillTimeSec = Math.floor(relevantFills[0].createdAt.getTime() / 1000);
      currentBucketTime = Math.floor(firstFillTimeSec / stepSec) * stepSec;
      lastClosePrice = parseFloat(relevantFills[0].price.toString());

      // Advance fillIdx to match the start of relevantFills in sortedFills
      const firstRelevantId = relevantFills[0].id;
      fillIdx = sortedFills.findIndex(f => f.id === firstRelevantId);
    } else {
      // Carry forward the last overall trade price if no fills exist in this window
      currentBucketTime = Math.floor(limitStartSec / stepSec) * stepSec;
      const lastOverallFill = sortedFills[sortedFills.length - 1];
      lastClosePrice = lastOverallFill ? parseFloat(lastOverallFill.price.toString()) : 0;
      fillIdx = sortedFills.length;
    }

    const endBucketTime = Math.floor(nowSec / stepSec) * stepSec;

    while (currentBucketTime <= endBucketTime) {
      // Find all fills that fall into this bucket: [currentBucketTime, currentBucketTime + stepSec)
      const bucketFills: typeof sortedFills = [];
      while (
        fillIdx < sortedFills.length &&
        Math.floor(sortedFills[fillIdx].createdAt.getTime() / 1000) < currentBucketTime + stepSec
      ) {
        bucketFills.push(sortedFills[fillIdx]);
        fillIdx++;
      }

      if (bucketFills.length > 0) {
        const prices = bucketFills.map((f) => parseFloat(f.price.toString()));
        const open = parseFloat(bucketFills[0].price.toString());
        const close = parseFloat(bucketFills[bucketFills.length - 1].price.toString());
        const high = Math.max(...prices);
        const low = Math.min(...prices);

        candles.push({
          time: currentBucketTime,
          open: open.toString(),
          high: high.toString(),
          low: low.toString(),
          close: close.toString(),
        });
        lastClosePrice = close;
      } else {
        // Carry forward the previous candle's close price
        candles.push({
          time: currentBucketTime,
          open: lastClosePrice.toString(),
          high: lastClosePrice.toString(),
          low: lastClosePrice.toString(),
          close: lastClosePrice.toString(),
        });
      }

      currentBucketTime += stepSec;
    }

    return candles;
  },

  /**
   * Get recent trades for a market.
   */
  async getMarketTrades(symbol: string): Promise<any[]> {
    const uppercaseSymbol = symbol.toUpperCase().replace('-', '/');
    const market = await marketRepository.getMarketBySymbol(uppercaseSymbol);

    if (!market) {
      throw new AppError(`Market with symbol '${symbol}' not found`, HTTP_STATUS.NOT_FOUND);
    }

    const fills = await marketRepository.getMarketTrades(market.id);
    return fills.map((f) => ({
      price: f.price.toString(),
      quantity: f.quantity.toString(),
      side: f.takerOrder.side,
      timestamp: f.createdAt.getTime(),
    }));
  },

  /**
   * Get 24-hour ticker statistics for a market.
   */
  async getMarketStats(symbol: string): Promise<any> {
    const uppercaseSymbol = symbol.toUpperCase().replace('-', '/');
    const market = await marketRepository.getMarketBySymbol(uppercaseSymbol);

    if (!market) {
      throw new AppError(`Market with symbol '${symbol}' not found`, HTTP_STATUS.NOT_FOUND);
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fills24h = await marketRepository.getMarketFillsSince(market.id, oneDayAgo);
    const lastFill = await marketRepository.getLastMarketFill(market.id);

    const lastPrice = lastFill ? parseFloat(lastFill.price.toString()) : 0;

    let high = lastPrice;
    let low = lastPrice;
    let volume = 0;
    let changePercent = 0;

    if (fills24h.length > 0) {
      const prices = fills24h.map((f) => parseFloat(f.price.toString()));
      high = Math.max(...prices);
      low = Math.min(...prices);
      volume = fills24h.reduce((acc, f) => acc + parseFloat(f.quantity.toString()), 0);

      const openPrice = parseFloat(fills24h[0].price.toString());
      if (openPrice > 0) {
        changePercent = ((lastPrice - openPrice) / openPrice) * 100;
      }
    }

    return {
      symbol: uppercaseSymbol,
      lastPrice: lastPrice > 0 ? lastPrice.toFixed(2) : undefined,
      change: (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%',
      high: high > 0 ? high.toFixed(2) : undefined,
      low: low > 0 ? low.toFixed(2) : undefined,
      volume: volume.toFixed(4),
      base: market.baseAsset.symbol,
      quote: market.quoteAsset.symbol,
    };
  },
};


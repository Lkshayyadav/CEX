import { marketRepository } from '../repositories';
import { AppError } from '../utils';
import { HTTP_STATUS } from '../constants';
import { AssetDTO, MarketDTO } from '../types';

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
};

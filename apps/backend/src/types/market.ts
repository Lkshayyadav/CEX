export interface AssetDTO {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketDTO {
  id: string;
  symbol: string;
  baseAssetId: string;
  quoteAssetId: string;
  minOrderSize: string;
  maxOrderSize: string;
  tickSize: string;
  stepSize: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  baseAsset?: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  quoteAsset?: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
  };
}

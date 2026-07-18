export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type OrderStatus = 'OPEN' | 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';

export interface Market {
  id: string;
  symbol: string;
  baseAssetId: string;
  quoteAssetId: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  userId: string;
  marketId: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price: string | null; // decimal serialized as string
  quantity: string;     // decimal serialized as string
  filledQuantity: string; // decimal serialized as string
  remainingQuantity: string; // decimal serialized as string
  averageFillPrice: string | null; // decimal serialized as string
  createdAt: Date;
  updatedAt: Date;
  market?: {
    id: string;
    symbol: string;
    baseAssetId: string;
    quoteAssetId: string;
  };
}

export interface Trade {
  id: string;
  marketId: string;
  price: string;
  quantity: string;
  buyerOrderId: string;
  sellerOrderId: string;
  createdAt: Date;
}

export interface ProcessOrderResult {
  order: Order;
  fills: Array<{
    price: string;
    quantity: string;
    tradeId: string;
    counterOrderId: string;
  }>;
}

// WebSocket Event Types
export interface OrderBookLevel {
  price: string;
  quantity: string;
}

export interface OrderBookUpdateEvent {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface TradeEvent {
  tradeId: string;
  symbol: string;
  price: string;
  quantity: string;
  side: OrderSide; // Taker side
  timestamp: number;
}

export interface TickerEvent {
  symbol: string;
  lastPrice: string;
  priceChange24h: string;
  priceChangePercent24h: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  timestamp: number;
}

export interface UserOrderEvent {
  userId: string;
  order: Order;
  event: 'PLACED' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  timestamp: number;
}

export interface UserBalanceEvent {
  userId: string;
  assetId: string;
  free: string;
  locked: string;
  timestamp: number;
}

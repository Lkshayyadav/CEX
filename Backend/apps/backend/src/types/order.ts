export interface OrderDTO {
  id: string;
  userId: string;
  marketId: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  status: 'PENDING' | 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  price: string | null;
  quantity: string;
  filledQuantity: string;
  remainingQuantity: string;
  averageFillPrice: string | null;
  createdAt: Date;
  updatedAt: Date;
  market?: {
    id: string;
    symbol: string;
  };
}

export interface CreateOrderInput {
  marketSymbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price?: string;
  quantity: string;
}

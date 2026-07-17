export interface BalanceDTO {
  id: string;
  userId: string;
  assetId: string;
  free: string;
  locked: string;
  createdAt: Date;
  updatedAt: Date;
  asset?: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
  };
}

export interface DepositInput {
  assetSymbol: string;
  amount: string;
}

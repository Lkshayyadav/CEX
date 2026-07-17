import { balanceRepository, marketRepository } from '../repositories';
import { AppError } from '../utils';
import { HTTP_STATUS } from '../constants';
import { BalanceDTO, DepositInput } from '../types';
import { prisma } from '../lib';

/**
 * Balance Service
 * Business logic, validation, and database transaction orchestration for user balances.
 */
export const balanceService = {
  /**
   * Get all balances for a specific user.
   */
  async getUserBalances(userId: string): Promise<BalanceDTO[]> {
    const balances = await balanceRepository.findBalancesByUser(userId);
    return balances.map((balance) => ({
      id: balance.id,
      userId: balance.userId,
      assetId: balance.assetId,
      free: balance.free.toString(),
      locked: balance.locked.toString(),
      createdAt: balance.createdAt,
      updatedAt: balance.updatedAt,
      asset: balance.asset,
    }));
  },

  /**
   * Get balance for a specific user and asset symbol (e.g. "BTC").
   * If the asset does not exist in the database, throws a 404 AppError.
   * If the balance record does not exist yet but the asset exists, returns a virtual 0 balance.
   */
  async getUserBalanceByAsset(userId: string, assetSymbol: string): Promise<BalanceDTO> {
    const symbol = assetSymbol.toUpperCase();
    
    // 1. Verify asset exists
    const asset = await marketRepository.getAssetBySymbol(symbol);
    if (!asset) {
      throw new AppError(`Asset with symbol '${assetSymbol}' not found`, HTTP_STATUS.NOT_FOUND);
    }

    // 2. Query balance
    const balance = await balanceRepository.findBalanceByUserAndAssetId(userId, asset.id);
    if (!balance) {
      return {
        id: '',
        userId,
        assetId: asset.id,
        free: '0.0000000000000000',
        locked: '0.0000000000000000',
        createdAt: new Date(),
        updatedAt: new Date(),
        asset: {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          decimals: asset.decimals,
        },
      };
    }

    return {
      id: balance.id,
      userId: balance.userId,
      assetId: balance.assetId,
      free: balance.free.toString(),
      locked: balance.locked.toString(),
      createdAt: balance.createdAt,
      updatedAt: balance.updatedAt,
      asset: balance.asset,
    };
  },

  /**
   * Deposit simulated funds to user's balance.
   * Uses a transaction to safely locate/create the balance record and increment it.
   */
  async deposit(userId: string, input: DepositInput): Promise<BalanceDTO> {
    const symbol = input.assetSymbol.toUpperCase();

    // 1. Verify asset exists
    const asset = await marketRepository.getAssetBySymbol(symbol);
    if (!asset) {
      throw new AppError(`Asset with symbol '${input.assetSymbol}' not found`, HTTP_STATUS.NOT_FOUND);
    }

    // 2. Perform write operation in a Prisma transaction
    const updated = await prisma.$transaction(async (tx) => {
      let balance = await balanceRepository.findBalanceByUserAndAssetId(userId, asset.id, tx);
      
      if (!balance) {
        // Create balance record if it doesn't exist
        balance = await balanceRepository.createBalance(userId, asset.id, '0', tx);
      }

      // Increment the free balance
      return balanceRepository.incrementFreeBalance(userId, asset.id, input.amount, tx);
    });

    return {
      id: updated.id,
      userId: updated.userId,
      assetId: updated.assetId,
      free: updated.free.toString(),
      locked: updated.locked.toString(),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      asset: updated.asset,
    };
  },
};

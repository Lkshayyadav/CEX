import { z } from 'zod';

/**
 * Validator schema for querying a single asset balance.
 */
export const getBalanceByAssetSchema = z.object({
  asset: z.string()
    .min(2, 'Asset symbol must be at least 2 characters long')
    .max(10, 'Asset symbol must not exceed 10 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Asset symbol must be alphanumeric'),
});

/**
 * Validator schema for simulated deposits.
 */
export const depositSchema = z.object({
  assetSymbol: z.string()
    .min(2, 'Asset symbol must be at least 2 characters long')
    .max(10, 'Asset symbol must not exceed 10 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Asset symbol must be alphanumeric'),
  amount: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Amount must be a valid decimal number')
    .refine((val) => {
      const parsed = parseFloat(val);
      return !isNaN(parsed) && parsed > 0;
    }, 'Amount must be greater than zero'),
});

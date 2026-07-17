import { z } from 'zod';

/**
 * Validator schema for getting detailed market information.
 */
export const getMarketBySymbolSchema = z.object({
  symbol: z.string()
    .min(3, 'Symbol must be at least 3 characters long')
    .max(20, 'Symbol must not exceed 20 characters')
    .regex(/^[A-Za-z0-9]+[\/|-][A-Za-z0-9]+$/, 'Market symbol must be in base/quote format (e.g. BTC/USDT)'),
});

export type GetMarketBySymbolParams = z.infer<typeof getMarketBySymbolSchema>;

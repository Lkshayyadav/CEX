import { z } from 'zod';

/**
 * Validator schema for querying a single order by ID.
 */
export const getOrderByIdSchema = z.object({
  id: z.string().uuid('Order ID must be a valid UUID'),
});

/**
 * Validator schema for creating BUY or SELL orders.
 * Validates symbol, side, type, price, and quantity.
 */
export const createOrderSchema = z.object({
  marketSymbol: z.string()
    .min(3, 'Market symbol must be at least 3 characters')
    .max(20, 'Market symbol must not exceed 20 characters')
    .regex(/^[A-Za-z0-9]+[\/|-][A-Za-z0-9]+$/, 'Market symbol must be in base/quote format (e.g. BTC/USDT)'),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  price: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Price must be a valid positive number')
    .refine((val) => {
      const parsed = parseFloat(val);
      return !isNaN(parsed) && parsed > 0;
    }, 'Price must be greater than zero')
    .optional(),
  quantity: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Quantity must be a valid positive number')
    .refine((val) => {
      const parsed = parseFloat(val);
      return !isNaN(parsed) && parsed > 0;
    }, 'Quantity must be greater than zero'),
}).superRefine((data, ctx) => {
  if (data.type === 'LIMIT' && !data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['price'],
      message: 'Price is required for LIMIT orders',
    });
  }
});

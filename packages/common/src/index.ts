import { Decimal } from 'decimal.js';

export function toDecimal(value: string | number): Decimal {
  return new Decimal(value);
}

export function formatDecimal(decimal: Decimal, precision = 8): string {
  return decimal.toFixed(precision);
}

import { Decimal } from 'decimal.js';
export function toDecimal(value) {
    return new Decimal(value);
}
export function formatDecimal(decimal, precision = 8) {
    return decimal.toFixed(precision);
}
export { redis, redisSub, redisService } from './redis';

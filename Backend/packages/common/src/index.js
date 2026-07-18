"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.redisSub = exports.redis = void 0;
exports.toDecimal = toDecimal;
exports.formatDecimal = formatDecimal;
const decimal_js_1 = require("decimal.js");
function toDecimal(value) {
    return new decimal_js_1.Decimal(value);
}
function formatDecimal(decimal, precision = 8) {
    return decimal.toFixed(precision);
}
var redis_1 = require("./redis");
Object.defineProperty(exports, "redis", { enumerable: true, get: function () { return redis_1.redis; } });
Object.defineProperty(exports, "redisSub", { enumerable: true, get: function () { return redis_1.redisSub; } });
Object.defineProperty(exports, "redisService", { enumerable: true, get: function () { return redis_1.redisService; } });

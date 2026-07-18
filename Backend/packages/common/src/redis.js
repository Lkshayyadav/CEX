"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSub = exports.redis = exports.redisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'redis-client' });
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
class RedisService {
    client = null;
    subClient = null;
    getClient() {
        if (!this.client) {
            this.client = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: null, // Required for BRPOP/blocking operations in ioredis
                reconnectOnError: (err) => {
                    logger.error(err, 'Redis connection error, attempting reconnect...');
                    return true;
                },
            });
            this.client.on('connect', () => {
                logger.info(`Redis client connected to ${redisUrl}`);
            });
            this.client.on('error', (err) => {
                logger.error(err, 'Redis connection error');
            });
        }
        return this.client;
    }
    getSubClient() {
        if (!this.subClient) {
            this.subClient = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: null,
                reconnectOnError: (err) => {
                    logger.error(err, 'Redis Sub client connection error, attempting reconnect...');
                    return true;
                },
            });
            this.subClient.on('connect', () => {
                logger.info(`Redis Sub client connected to ${redisUrl}`);
            });
            this.subClient.on('error', (err) => {
                logger.error(err, 'Redis Sub client connection error');
            });
        }
        return this.subClient;
    }
    async disconnect() {
        const c = this.client;
        if (c) {
            try {
                this.client = null;
                await c.quit();
                logger.info('Redis client disconnected cleanly');
            }
            catch (err) {
                logger.error(err, 'Error during Redis disconnect');
                try {
                    c.disconnect();
                }
                catch (e) {
                    // Ignore secondary failures
                }
            }
        }
        const sc = this.subClient;
        if (sc) {
            try {
                this.subClient = null;
                await sc.quit();
                logger.info('Redis Sub client disconnected cleanly');
            }
            catch (err) {
                logger.error(err, 'Error during Redis Sub disconnect');
                try {
                    sc.disconnect();
                }
                catch (e) {
                    // Ignore secondary failures
                }
            }
        }
    }
}
exports.redisService = new RedisService();
exports.redis = exports.redisService.getClient();
exports.redisSub = exports.redisService.getSubClient();

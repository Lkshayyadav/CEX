import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'redis-client' });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisService {
  private client: Redis | null = null;
  private subClient: Redis | null = null;

  public getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(redisUrl, {
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

  public getSubClient(): Redis {
    if (!this.subClient) {
      this.subClient = new Redis(redisUrl, {
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

  public async disconnect(): Promise<void> {
    const c = this.client;
    if (c) {
      try {
        this.client = null;
        await c.quit();
        logger.info('Redis client disconnected cleanly');
      } catch (err) {
        logger.error(err, 'Error during Redis disconnect');
        try {
          c.disconnect();
        } catch (e) {
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
      } catch (err) {
        logger.error(err, 'Error during Redis Sub disconnect');
        try {
          sc.disconnect();
        } catch (e) {
          // Ignore secondary failures
        }
      }
    }
  }
}

export const redisService = new RedisService();
export const redis = redisService.getClient();
export const redisSub = redisService.getSubClient();


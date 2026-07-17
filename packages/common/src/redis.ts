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
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis client disconnected cleanly');
      } catch (err) {
        logger.error(err, 'Error during Redis disconnect');
        this.client.disconnect();
      } finally {
        this.client = null;
      }
    }
    if (this.subClient) {
      try {
        await this.subClient.quit();
        logger.info('Redis Sub client disconnected cleanly');
      } catch (err) {
        logger.error(err, 'Error during Redis Sub disconnect');
        this.subClient.disconnect();
      } finally {
        this.subClient = null;
      }
    }
  }
}

export const redisService = new RedisService();
export const redis = redisService.getClient();
export const redisSub = redisService.getSubClient();


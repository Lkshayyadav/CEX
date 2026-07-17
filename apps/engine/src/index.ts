import { matchingEngine } from './engine';
import { redis, redisService } from '@cex/common';
import { Order } from '@cex/types';
import pino from 'pino';

const logger = pino({ name: 'engine-bootstrap' });

async function startConsumer() {
  logger.info('Initializing Matching Engine...');
  await matchingEngine.initialize();
  logger.info('Matching Engine initialized successfully.');

  logger.info('Starting Redis consumer loop for "engine:orders"...');
  
  let running = true;

  // Handle shutdown signals gracefully
  const shutdown = async () => {
    logger.info('Received shutdown signal, stopping consumer loop...');
    running = false;
    await redisService.disconnect();
    logger.info('Redis client disconnected gracefully.');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (running) {
    try {
      // BRPOP blocks for at most 5 seconds, returning [key, value] or null on timeout
      const result = await redis.brpop('engine:orders', 5);
      if (!result) {
        continue;
      }
      
      const [_queue, payload] = result;
      logger.info(`Popped order payload from queue`);
      
      const orderData = JSON.parse(payload);
      const order: Order = {
        ...orderData,
        createdAt: new Date(orderData.createdAt),
        updatedAt: new Date(orderData.updatedAt),
      };

      const matchResult = await matchingEngine.processOrder(order);
      logger.info(`Successfully processed order ${order.id}. Fills generated: ${matchResult.fills.length}`);
    } catch (err) {
      logger.error(err, 'Error encountered in Redis consumer loop');
      // Wait to prevent rapid hot looping if error is persistent
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  logger.info('Consumer loop stopped.');
}

startConsumer().catch((err) => {
  logger.error(err, 'Failed to start matching engine consumer');
  process.exit(1);
});

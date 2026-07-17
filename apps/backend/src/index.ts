import pino from 'pino';
import app from './app';
import { config } from './config';
import { prisma } from './lib';

const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
});

let server: ReturnType<typeof app.listen>;

const startServer = async () => {
  try {
    logger.info('[server]: Connecting to the database...');
    await prisma.$connect();
    logger.info('[server]: Database connection established successfully.');

    server = app.listen(config.port, () => {
      logger.info(
        `[server]: CEX Backend is running in [${config.env}] mode at http://localhost:${config.port}`
      );
    });
  } catch (error) {
    logger.error({ err: error }, '[server]: Failed to bootstrap the server');
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`[server]: Received ${signal}. Shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      logger.info('[server]: HTTP server closed.');
    });
  }

  try {
    await prisma.$disconnect();
    logger.info('[server]: Database connections closed.');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, '[server]: Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

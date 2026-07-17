import app from './app';
import { config } from './config';
import { prisma } from './lib';

const startServer = async () => {
  try {
    // Verify database connection before starting the server
    console.log('[server]: Connecting to the database...');
    await prisma.$connect();
    console.log('[server]: Database connection established successfully.');

    app.listen(config.port, () => {
      console.log(`[server]: CEX Backend is running in [${config.env}] mode at http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('[server]: Failed to bootstrap the server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`[server]: Received ${signal}. Shutting down gracefully...`);
  try {
    await prisma.$disconnect();
    console.log('[server]: Database connections closed.');
    process.exit(0);
  } catch (error) {
    console.error('[server]: Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

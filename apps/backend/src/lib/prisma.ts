import { PrismaClient } from '@prisma/client';
import { config } from '../config';

// Declare global type to avoid multiple prisma client instances in development hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
    log: config.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.env !== 'production') {
  global.prisma = prisma;
}

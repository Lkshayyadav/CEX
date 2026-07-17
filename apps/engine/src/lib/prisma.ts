import { PrismaClient } from '@prisma/client';
import { config } from '../config';

declare global {
  // eslint-disable-next-line no-var
  var prismaEngine: PrismaClient | undefined;
}

export const prisma =
  global.prismaEngine ||
  new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
    log: config.env === 'development' ? ['error', 'warn'] : ['error'],
  });

if (config.env !== 'production') {
  global.prismaEngine = prisma;
}

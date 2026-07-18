import { PrismaClient } from '@prisma/client';
import { config } from '../config';

/**
 * Prisma Client Singleton Pattern
 * 
 * --- WHY A SINGLETON IS USED ---
 * A singleton pattern ensures that a class has only one instance and provides a global point of 
 * access to it. For Prisma, this means a single instantiation of `PrismaClient` manages all 
 * database interactions for the entire application.
 * 
 * --- WHAT PROBLEM IT SOLVES ---
 * In Node.js applications, and especially during development, tools like `tsx watch` or `nodemon` 
 * perform hot-reloads of files when they change. Without a singleton stored in a global namespace, 
 * each hot-reload would re-execute the module importing Prisma and create a brand-new 
 * `PrismaClient` instance.
 * 
 * --- WHY MULTIPLE PRISMA CLIENTS ARE HARMFUL ---
 * 1. Connection Exhaustion: Each new `PrismaClient` instance establishes its own connection pool 
 *    to the database. Under hot-reloading or poor architecture, these connections pile up, 
 *    rapidly exceeding the database's maximum allowed connections and throwing "Too many connections" errors.
 * 2. Resource Leakage: Prisma Client spawns a query engine child process under the hood. Multiple 
 *    instances mean multiple running binaries, leaking CPU and memory.
 * 3. Overhead: The overhead of establishing new TCP handshakes and database sessions degrades performance.
 */

// Declare global type to avoid multiple prisma client instances in development hot-reloads.
// In TypeScript, declaring it on `globalThis` or `global` prevents type errors.
declare global {
  // We use `var` because `let` and `const` are scoped to the module and do not attach to `globalThis` in TS.
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
    // Customize logging based on environment: verbose query logs in dev, only errors in prod.
    log: config.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Save the instantiated prisma client into global scope if we are not in production.
// This preserves the instance across hot-reloads in development.
if (config.env !== 'production') {
  global.prisma = prisma;
}

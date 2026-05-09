import { PrismaClient } from '@prisma/client';
import { isDev, isTest } from '../config/env.js';
import { logger } from './logger.js';

// Single PrismaClient per process. Hot-reload protection in dev: Node ESM
// caches module exports, but tsx watch creates fresh module graphs on reload,
// so we don't need the `globalThis` trick that ts-node setups use.
//
// In `test` mode we silence Prisma's stdout: the suite intentionally exercises
// `P2025` (record not found) on the not-found paths, and Prisma's pretty
// error printer would otherwise pollute the test report with apparent errors
// that are actually being handled.

export const prisma = new PrismaClient({
  log: isDev
    ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
    : isTest
      ? []
      : ['warn', 'error'],
});

if (isDev) {
  // Prisma's `query` events are noisy. Wired at debug so flipping LOG_LEVEL
  // surfaces them without code changes. The cast covers Prisma 5's typing
  // gap on the `$on('query', ...)` overload when `log: [{ emit: 'event' }]`.
  (prisma as unknown as {
    $on(event: 'query', cb: (e: { query: string; params: string; duration: number }) => void): void;
  }).$on('query', (e) => {
    logger.debug({ query: e.query, params: e.params, durationMs: e.duration }, 'prisma.query');
  });
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('prisma.disconnected');
}

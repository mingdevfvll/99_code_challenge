import { PrismaClient } from '@prisma/client';
import { isDev } from '../config/env.js';
import { logger } from './logger.js';

// Single PrismaClient per process. Hot-reload protection in dev: Node ESM
// caches module exports, but tsx watch creates fresh module graphs on reload,
// so we don't need the `globalThis` trick that ts-node setups use.

export const prisma = new PrismaClient({
  log: isDev
    ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
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

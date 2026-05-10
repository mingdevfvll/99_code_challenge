import { createApp } from './server.js';
import { env } from './core/config/env.js';
import { logger } from './core/lib/logger.js';
import { disconnectPrisma } from './core/lib/prisma.js';
import { disconnectRedis } from './core/lib/redis.js';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info(
    { port: env.API_PORT, env: env.NODE_ENV },
    'http.listening',
  );
});

// Graceful shutdown. Close the HTTP server first (stops accepting new
// connections, waits for in-flight requests), then disconnect Prisma + Redis.
// Force-exit after 10s if anything hangs.

let shuttingDown = false;
async function shutdown(signal: string, code: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutdown.start');

  const forceExit = setTimeout(() => {
    logger.error('shutdown.forced — process did not exit cleanly within 10s');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  await new Promise<void>((resolve) => {
    server.close((err) => {
      if (err) logger.warn({ err: err.message }, 'shutdown.server_close_failed');
      resolve();
    });
  });

  await Promise.allSettled([disconnectPrisma(), disconnectRedis()]);
  logger.info('shutdown.complete');
  process.exit(code);
}

process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
process.on('SIGINT', () => void shutdown('SIGINT', 0));

process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, 'uncaughtException');
  void shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal(
    { reason: reason instanceof Error ? reason.message : String(reason) },
    'unhandledRejection',
  );
  void shutdown('unhandledRejection', 1);
});

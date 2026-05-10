import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

// Shared ioredis client. Used by:
//   - cache.ts (get/set with TTL)
//   - rate-limit.ts (via rate-limit-redis)
//
// Retry strategy: backoff capped at 2s. Reconnect on errors. We don't want a
// brief Redis blip to crash the API, so failures here are logged but don't
// throw out of this module — the cache wrapper handles fall-through, and the
// rate limiter degrades to in-memory if `sendCommand` rejects.

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 200, 2000),
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some((e) => err.message.includes(e));
  },
});

redis.on('connect', () => logger.info('redis.connect'));
redis.on('ready', () => logger.info('redis.ready'));
redis.on('error', (err) => logger.warn({ err: err.message }, 'redis.error'));
redis.on('close', () => logger.warn('redis.close'));
redis.on('reconnecting', (delay: number) => logger.info({ delayMs: delay }, 'redis.reconnecting'));

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('redis.disconnected');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'redis.quit_failed');
    redis.disconnect();
  }
}

export async function pingRedis(): Promise<'ok' | 'down'> {
  try {
    const reply = await redis.ping();
    return reply === 'PONG' ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

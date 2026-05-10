import { redis } from './redis.js';
import { logger } from './logger.js';

// Thin cache wrapper around Redis with graceful degradation.
//
// The contract: every method catches Redis errors and falls back to "no cache".
// A Redis outage degrades reads to direct DB hits; it never crashes the API.
// Tracked at warn level so it's visible without being noisy.
//
// Key namespaces (used by services):
//   tasks:list:<sha256(filters)>   TTL 30s
//   tasks:item:<id>                TTL 60s
//
// See `docs/02-architecture.md` ("Cache invalidation") and
// `docs/06-observability.md` ("scaling").

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'cache.get_failed');
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'cache.set_failed');
    }
  },

  async getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const hit = await cache.get<T>(key);
    if (hit !== null) {
      logger.debug({ key }, 'cache.hit');
      return hit;
    }
    logger.debug({ key }, 'cache.miss');
    const value = await loader();
    await cache.set(key, value, ttlSeconds);
    return value;
  },

  async invalidate(key: string): Promise<void> {
    try {
      await redis.del(key);
      logger.debug({ key }, 'cache.invalidate');
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'cache.invalidate_failed');
    }
  },

  // SCAN + DEL by prefix. See `docs/06-observability.md` for the versioned-
  // namespace alternative we'd reach for under write-heavy load.
  async invalidatePrefix(prefix: string): Promise<number> {
    let removed = 0;
    try {
      const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
      const pipeline = redis.pipeline();
      for await (const keys of stream as AsyncIterable<string[]>) {
        for (const key of keys) {
          pipeline.del(key);
          removed += 1;
        }
      }
      if (removed > 0) await pipeline.exec();
      logger.debug({ prefix, removed }, 'cache.invalidate_prefix');
    } catch (err) {
      logger.warn({ err: (err as Error).message, prefix }, 'cache.invalidate_prefix_failed');
    }
    return removed;
  },
};

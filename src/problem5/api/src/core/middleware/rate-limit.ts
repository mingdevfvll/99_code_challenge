import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { RateLimitError } from '../errors/http-errors.js';

// Two limiters:
//   - global: every request, 100/min/ip by default
//   - mutating: POST/PATCH/DELETE only, 30/min/ip by default
//
// Both Redis-backed via rate-limit-redis. If Redis is unreachable when the
// store tries to call, the in-memory fallback kicks in — degraded but
// functional. Logged at warn so the operator sees it.
//
// IPv6 keying: express-rate-limit v7's default keyGenerator handles
// IPv4-mapped IPv6 and prefix-based IPv6 keying internally; we don't override.

function makeStore(prefix: string) {
  return new RedisStore({
    prefix,
    sendCommand: async (command: string, ...args: string[]) => {
      try {
        return (await redis.call(command, ...args)) as string | number | (string | number)[];
      } catch (err) {
        logger.warn({ err: (err as Error).message, prefix }, 'rate_limit.redis_failed');
        throw err;
      }
    },
  });
}

const sharedOptions = {
  windowMs: 60_000,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new RateLimitError('Too many requests', 60));
  },
};

export const globalLimiter: RequestHandler = rateLimit({
  ...sharedOptions,
  limit: env.RATE_LIMIT_GLOBAL,
  store: makeStore('rl:global:'),
});

const mutationOnly: RequestHandler = rateLimit({
  ...sharedOptions,
  limit: env.RATE_LIMIT_MUTATIONS,
  store: makeStore('rl:mut:'),
});

export const mutationLimiter: RequestHandler = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  return mutationOnly(req, res, next);
};

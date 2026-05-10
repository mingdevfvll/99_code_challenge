import { Router } from 'express';
import { prisma } from '../../core/lib/prisma.js';
import { pingRedis } from '../../core/lib/redis.js';
import { logger } from '../../core/lib/logger.js';

// Two endpoints, two different jobs (see `docs/06-observability.md`):
//   /healthz  → process is up. Always 200. Effectively free.
//   /readyz   → can serve traffic. Pings Postgres + Redis. ~5ms.
//
// Postgres unavailable → 503. Redis unavailable → 200 with redis: 'degraded',
// because the cache layer falls back to no-cache rather than crashing.

const router: Router = Router();

router.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/readyz', async (req, res) => {
  const [pg, rd] = await Promise.all([pingPostgres(), pingRedis()]);
  const checks = { postgres: pg, redis: rd };

  const ready = pg === 'ok';
  if (!ready) {
    logger.warn({ checks, reqId: req.id }, 'readyz.not_ready');
    return res.status(503).json({ status: 'not_ready', checks });
  }

  return res.status(200).json({
    status: 'ok',
    checks: { postgres: pg, redis: rd === 'ok' ? 'ok' : 'degraded' },
  });
});

async function pingPostgres(): Promise<'ok' | 'down'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch {
    return 'down';
  }
}

export { router as healthRoutes };

import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';

import { env, isProd } from './core/config/env.js';
import { logger } from './core/lib/logger.js';
import { requestId } from './core/middleware/request-id.js';
import { globalLimiter, mutationLimiter } from './core/middleware/rate-limit.js';
import { notFound } from './core/middleware/not-found.js';
import { errorHandler } from './core/middleware/error-handler.js';

import { healthRoutes } from './modules/health/health.routes.js';
import { taskRoutes } from './modules/task/task.routes.js';
import { debugRoutes } from './modules/_debug/debug.routes.js';
import { docsRoutes } from './core/openapi/docs.routes.js';

// createApp() is the testable factory. It wires middleware in the pinned
// order from `docs/02-architecture.md` and returns the Express app without
// listening. `index.ts` is the bootstrap that calls listen().
//
// Order matters and is pinned here. Don't shuffle without understanding why.

export function createApp(): Express {
  const app = express();

  // Security + traffic shaping first. Helmet defaults are reasonable; the
  // tightened CSP for /docs lives next to that route in Phase 4.
  app.use(helmet());

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: false,
    }),
  );

  app.use(compression());

  // Request id BEFORE pino-http so the entry log line carries it.
  app.use(requestId);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as unknown as { id?: string }).id ?? 'unknown',
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  // Rate limit BEFORE body parser so floods of large payloads can't spend
  // memory parsing requests we're about to reject.
  app.use(globalLimiter);
  app.use(mutationLimiter);

  app.use(express.json({ limit: env.BODY_LIMIT }));

  // Routes.
  app.use(healthRoutes);
  app.use(docsRoutes);
  app.use('/api/v1/tasks', taskRoutes);

  if (!isProd) {
    app.use(debugRoutes);
  }

  // 404 + error handler MUST be last.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

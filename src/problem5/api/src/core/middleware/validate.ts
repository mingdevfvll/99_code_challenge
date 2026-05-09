import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/http-errors.js';

// Generic Zod validator. On success, stashes the parsed (and transformed)
// value at `req.validated[source]`. Handlers read from there with a typed
// helper (`getValidated`).
//
// Why not `req.body = parsed`? Express 5 made `req.query` and `req.params`
// readonly getters on the IncomingMessage. Reassigning throws. Using a
// dedicated `validated` namespace keeps the contract uniform across sources
// and avoids the trap.
//
// Usage:
//   router.post('/x', validate(createSchema), handler);
//   router.get('/x',  validate(listQuerySchema, 'query'), handler);
//
// In handler:
//   const input = getValidated<CreateXInput>(req, 'body');

type Source = 'body' | 'query' | 'params';

export function validate<S extends ZodTypeAny>(
  schema: S,
  source: Source = 'body',
): RequestHandler {
  return (req, _res, next) => {
    const input = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const result = schema.safeParse(input);

    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      }));
      return next(
        new ValidationError(`Request ${source} failed validation`, details),
      );
    }

    if (!req.validated) req.validated = {};
    req.validated[source] = result.data;

    // Backward-compat for body only: handlers that haven't migrated to
    // getValidated() will still see the parsed value at req.body.
    if (source === 'body') {
      req.body = result.data;
    }

    next();
  };
}

export function getValidated<T>(
  req: { validated?: { body?: unknown; query?: unknown; params?: unknown } },
  source: Source,
): T {
  const v = req.validated?.[source];
  if (v === undefined) {
    throw new Error(`No validated ${source} on request — did you forget validate(${source}Schema)?`);
  }
  return v as T;
}

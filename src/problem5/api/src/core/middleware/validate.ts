import type { RequestHandler } from 'express';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import { ValidationError } from '../errors/http-errors.js';

// Generic Zod validator. Pass the schema and (optionally) which part of the
// request to validate. On success, replaces that part with the parsed value
// so downstream handlers get strongly-typed input.
//
// Usage:
//   router.post('/tasks', validate(createTaskSchema), handler);
//   router.get('/tasks',  validate(listQuerySchema, 'query'), handler);

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

    // Replace the original on the request so handlers see the parsed value.
    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      (req as unknown as { query: ZodInfer<S> }).query = result.data;
    } else {
      (req as unknown as { params: ZodInfer<S> }).params = result.data;
    }

    next();
  };
}

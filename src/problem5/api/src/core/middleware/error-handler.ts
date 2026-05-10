import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError, isHttpError, ValidationError } from '../errors/http-errors.js';
import { logger } from '../lib/logger.js';
import { isProd } from '../config/env.js';

// Last middleware in the chain. Maps known errors to envelopes; falls through
// to INTERNAL_ERROR for anything unrecognized. The request id always travels
// with the response, even on 500s.
//
// Express 5 propagates async errors here automatically; no asyncHandler wrap.

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // pino-http widens req.id to `string | number`; ours is always string but
  // the type intersection stays widened. Coerce once at the boundary.
  const reqId = String(req.id);

  if (res.headersSent) {
    // If a response started streaming, delegate to Express's default closer.
    // We can't change the status anymore at this point.
    logger.error({ err: serialize(err), reqId }, 'error_after_headers_sent');
    return next(err);
  }

  // ZodError thrown outside a `validate()` middleware (defensive: a service
  // that re-parses with a Zod schema should still surface as 400, not 500).
  if (err instanceof ZodError) {
    const ve = new ValidationError('Request failed validation', formatZodIssues(err));
    return respond(res, reqId, ve);
  }

  if (isHttpError(err)) {
    if (err.statusCode >= 500) {
      logger.error({ err: serialize(err), reqId }, 'http_error');
    } else {
      logger.warn({ err: serialize(err), code: err.code, reqId }, 'http_error');
    }
    return respond(res, reqId, err);
  }

  // body-parser surfaces typed errors via `err.type`. Translate the ones
  // worth special-casing.
  const bodyParser = mapBodyParserError(err);
  if (bodyParser) {
    return respond(res, reqId, bodyParser);
  }

  logger.error({ err: serialize(err), reqId }, 'unhandled_error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: reqId,
    },
  });
};

function respond(
  res: Parameters<ErrorRequestHandler>[2],
  requestId: string,
  err: HttpError,
) {
  const body: Record<string, unknown> = {
    code: err.code,
    message: err.message,
    requestId,
  };
  if (err.details !== undefined) body.details = err.details;
  res.status(err.statusCode).json({ error: body });
}

function formatZodIssues(err: ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code,
  }));
}

function mapBodyParserError(err: unknown): HttpError | null {
  if (typeof err !== 'object' || err === null || !('type' in err)) return null;
  const type = (err as { type: unknown }).type;
  if (typeof type !== 'string') return null;

  const message = (err as { message?: string }).message ?? 'Bad request';

  switch (type) {
    case 'entity.too.large':
      return new HttpError({
        code: 'PAYLOAD_TOO_LARGE',
        statusCode: 413,
        message: 'Request body too large',
      });
    case 'entity.parse.failed':
    case 'charset.unsupported':
      return new HttpError({
        code: 'BAD_REQUEST',
        statusCode: 400,
        message: 'Invalid request body',
      });
    case 'encoding.unsupported':
      return new HttpError({
        code: 'UNSUPPORTED_MEDIA_TYPE',
        statusCode: 415,
        message: 'Unsupported encoding',
      });
    default:
      return new HttpError({ code: 'BAD_REQUEST', statusCode: 400, message });
  }
}

function serialize(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: isProd ? undefined : err.stack,
    };
  }
  return { value: String(err) };
}

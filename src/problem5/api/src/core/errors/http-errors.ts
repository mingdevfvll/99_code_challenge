// Domain-shaped error classes. Throw these from any layer; the error handler
// (`core/middleware/error-handler.ts`) maps them to status codes + envelopes.
//
// The point of having these instead of throwing strings or generic Errors:
// the service/repository layer never needs to import HTTP types or know
// status codes. They just throw `NotFoundError`; the HTTP layer translates.

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface HttpErrorOptions {
  code: ErrorCode;
  statusCode: number;
  message: string;
  details?: unknown;
  cause?: unknown;
}

export class HttpError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(opts: HttpErrorOptions) {
    super(opts.message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = 'HttpError';
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.details = opts.details;
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Request failed validation', details?: unknown) {
    super({ code: 'VALIDATION_ERROR', statusCode: 400, message, details });
    this.name = 'ValidationError';
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, details?: unknown) {
    super({ code: 'BAD_REQUEST', statusCode: 400, message, details });
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super({ code: 'NOT_FOUND', statusCode: 404, message });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, details?: unknown) {
    super({ code: 'CONFLICT', statusCode: 409, message, details });
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends HttpError {
  constructor(message = 'Too many requests', retryAfterSeconds?: number) {
    super({
      code: 'RATE_LIMITED',
      statusCode: 429,
      message,
      details: retryAfterSeconds !== undefined ? { retryAfterSeconds } : undefined,
    });
    this.name = 'RateLimitError';
  }
}

export class DependencyError extends HttpError {
  constructor(message: string, cause?: unknown) {
    super({ code: 'DEPENDENCY_UNAVAILABLE', statusCode: 503, message, cause });
    this.name = 'DependencyError';
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}

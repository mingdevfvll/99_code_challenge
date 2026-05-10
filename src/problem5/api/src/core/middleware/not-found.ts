import type { RequestHandler } from 'express';
import { NotFoundError } from '../errors/http-errors.js';

// Catches anything that didn't match a route. Throws a NotFoundError so the
// envelope is consistent with all other 404s (single-resource lookups, etc.).

export const notFound: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};

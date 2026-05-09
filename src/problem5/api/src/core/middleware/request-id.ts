import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

// Honors an inbound x-request-id; generates a UUID v4 otherwise. Sets the same
// id on the response header so clients (and the web app) can correlate.
//
// Runs BEFORE pino-http so every log line for the request carries the id.

const HEADER = 'x-request-id';

export const requestId: RequestHandler = (req, res, next) => {
  const inbound = req.headers[HEADER];
  const id =
    typeof inbound === 'string' && inbound.length > 0 && inbound.length <= 128
      ? inbound
      : randomUUID();
  req.id = id;
  res.setHeader(HEADER, id);
  next();
};

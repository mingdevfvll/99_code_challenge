import type { Express } from 'express';
import { createApp } from '../../src/server.js';

let cached: Express | null = null;

// One Express app instance shared across tests in a worker. createApp() is
// pure (no listen()), and reusing it avoids re-binding pino-http for each
// test — small but adds up over a full suite.
export function getTestApp(): Express {
  if (!cached) {
    cached = createApp();
  }
  return cached;
}

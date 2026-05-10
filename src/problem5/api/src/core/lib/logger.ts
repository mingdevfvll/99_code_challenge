import pino, { type Logger } from 'pino';
import { env, isProd } from '../config/env.js';

// Pretty in dev, JSON in prod. Same logger instance reused across the app;
// pino-http will create child loggers per request with the request id bound.

const transport = isProd
  ? undefined
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    };

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  ...(transport ? { transport } : {}),
  base: { service: 'problem5-api' },
  redact: {
    paths: ['password', 'token', 'authorization', 'req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
});

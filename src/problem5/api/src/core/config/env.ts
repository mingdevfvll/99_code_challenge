import { z } from 'zod';

// Parse + validate environment variables once at boot. A missing or malformed
// var crashes the process before listening, with a clear message — better than
// failing strange at first request. See `docs/13-security.md` ("Secrets handling").

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  API_PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  WEB_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean)),

  RATE_LIMIT_GLOBAL: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_MUTATIONS: z.coerce.number().int().positive().default(30),

  BODY_LIMIT: z.string().default('1mb'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // No logger yet at this point in the boot sequence.
  console.error('[env] Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

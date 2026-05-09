import { loadEnvFile } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll } from 'vitest';

// Worker processes don't inherit globalSetup's env loading — load again here
// before any module that reads process.env (env.ts, prisma client) is imported.
const here = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.join(here, '..', '.env.test'));

// Late-binding the imports so env loads first.
const { prisma } = await import('../src/core/lib/prisma.js');
const { redis } = await import('../src/core/lib/redis.js');

beforeAll(async () => {
  // Confirm Redis is reachable before tests run; fail fast if compose isn't up.
  await redis.ping();
});

afterEach(async () => {
  // TRUNCATE keeps schema and serial sequences but wipes rows. Cheaper than
  // dropping/recreating, and survives FK constraints with RESTART IDENTITY.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Task" RESTART IDENTITY CASCADE;');
  // Cache must be cleared too — stale list entries will fail the next test.
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

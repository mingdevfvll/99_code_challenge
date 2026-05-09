import { execSync } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(here, '..');

// Load test env BEFORE anything else — env.ts reads at import time.
loadEnvFile(path.join(apiRoot, '.env.test'));

// Runs once per Vitest invocation.
export default async function setup() {
  if (!process.env.DATABASE_URL?.includes('tasks_test')) {
    throw new Error(
      `[test] Refusing to run: DATABASE_URL does not point at tasks_test (got ${process.env.DATABASE_URL ?? 'unset'}). Did .env.test load?`,
    );
  }

  // Apply migrations to the test database. `migrate deploy` is non-interactive
  // and idempotent — fine to call on every suite start.
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });

  return async () => {
    // Per-test cleanup happens in tests/setup.ts. Nothing to tear down here:
    // containers belong to the developer, not the suite.
  };
}

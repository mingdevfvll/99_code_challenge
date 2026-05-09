import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Test DB is shared so tests can't run in parallel without coordination
    // (each test truncates between runs). One worker keeps things simple and
    // the suite is small enough that wall-clock cost is negligible.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 30_000,
    testTimeout: 15_000,
    reporters: process.env.CI ? ['default'] : ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/modules/_debug/**',
      ],
    },
  },
});

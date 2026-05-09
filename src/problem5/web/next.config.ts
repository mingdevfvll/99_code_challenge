import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Pin the Turbopack root so Next doesn't walk up the monorepo and pick the
  // outer lockfile. Both lockfiles exist on purpose (root + per-package), so
  // silencing the inferred-root warning here is the right call.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

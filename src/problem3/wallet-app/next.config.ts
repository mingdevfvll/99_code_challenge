import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// Build the CSP value once so it can be reused in headers().
const cspDirectives = [
  "default-src 'self'",
  // react-refresh (Fast Refresh / HMR) calls eval() internally in dev mode.
  // unsafe-eval is intentionally limited to development — the production bundle
  // never includes react-refresh so this directive is omitted there.
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  // Tailwind generates utility classes as inline styles.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Allow HMR websocket in dev; restrict to same origin in production.
  isDev ? "connect-src 'self' ws://localhost:* http://localhost:*" : "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  webpack(config, { dev }) {
    if (dev) {
      // Default devtool is 'eval' which wraps every module in eval() —
      // that violates any script-src policy without unsafe-eval.
      // 'cheap-module-source-map' gives equivalent line-level source maps
      // using external .map files, so no eval() is emitted.
      config.devtool = 'cheap-module-source-map';
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
          // Prevent browsers from MIME-sniffing the response content-type.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Block the page from being embedded in a frame (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;

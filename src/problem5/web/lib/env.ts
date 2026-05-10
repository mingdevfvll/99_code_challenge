// Client-side env access. NEXT_PUBLIC_* vars are inlined at build time, so a
// missing one would silently fall through to `undefined`. Centralize the
// access here and fail loud on import if something critical is missing.

const required = (name: string, value: string | undefined): string => {
  if (!value || value.length === 0) {
    throw new Error(`[env] Missing ${name}. Set it in .env.local before starting the dev server.`);
  }
  return value;
};

export const env = {
  apiUrl: required('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
};

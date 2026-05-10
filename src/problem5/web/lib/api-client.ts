import { env } from './env';

// Thin typed wrapper around fetch. Three things this layer owns:
//   1. Base URL injection (NEXT_PUBLIC_API_URL).
//   2. JSON serialization in/out + request id correlation.
//   3. Translating non-2xx into a typed `ApiError` so React Query handlers
//      can branch on `code` instead of parsing strings.
//
// Task-specific bindings live in `lib/api/tasks.ts`; this file only owns the
// transport contract.

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorEnvelope['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.requestId = body.requestId;
    this.details = body.details;
  }
}

type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  query?: Record<string, string | number | boolean | string[] | undefined>;
};

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.startsWith('http') ? path : `${env.apiUrl}${path}`);
  if (!query) return url.toString();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, String(v));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function newRequestId(): string {
  // Browsers all support crypto.randomUUID since 2022. The fallback exists
  // for environments where the API is called from server components during
  // SSR — Next 16 polyfills it but it's cheap to be defensive.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { query, headers, ...rest } = options;
  const requestId = newRequestId();

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': requestId,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    ...rest,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? (JSON.parse(text) as unknown) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!res.ok) {
    const envelope = (parsed as ApiErrorEnvelope | undefined)?.error;
    if (envelope) {
      throw new ApiError(res.status, envelope);
    }
    // Server didn't return our envelope — surface a synthetic one so callers
    // don't have to special-case "the world didn't answer in JSON".
    throw new ApiError(res.status, {
      code: 'NETWORK_ERROR',
      message: res.statusText || text.slice(0, 120) || 'Request failed',
      requestId,
    });
  }

  if (parsed === undefined && text) {
    throw new ApiError(res.status, {
      code: 'INVALID_RESPONSE',
      message: 'API returned a non-JSON response.',
      requestId,
    });
  }

  return parsed as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
};

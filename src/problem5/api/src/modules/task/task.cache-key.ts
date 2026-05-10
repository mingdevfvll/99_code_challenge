import { createHash } from 'node:crypto';
import type { ListTaskQuery } from './task.schema.js';

// Stable cache key builder. Two queries with the same effective filters must
// produce the same key, regardless of property insertion order or undefined
// values. Tests in `tests/unit/cache-key.test.ts` lock this contract.

export function listCacheKey(filters: ListTaskQuery): string {
  return `tasks:list:${sha256(canonicalize(filters))}`;
}

export function itemCacheKey(id: string): string {
  return `tasks:item:${id}`;
}

export const LIST_KEY_PREFIX = 'tasks:list:';

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`;
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

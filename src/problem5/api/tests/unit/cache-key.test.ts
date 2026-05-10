import { describe, expect, it } from 'vitest';
import { itemCacheKey, listCacheKey, LIST_KEY_PREFIX } from '../../src/modules/task/task.cache-key.js';
import type { ListTaskQuery } from '../../src/modules/task/task.schema.js';

const base = (over: Partial<ListTaskQuery> = {}): ListTaskQuery => ({
  limit: 20,
  status: undefined,
  priority: undefined,
  q: undefined,
  dueBefore: undefined,
  dueAfter: undefined,
  tags: undefined,
  sort: undefined,
  cursor: undefined,
  ...over,
});

describe('cache key', () => {
  it('listCacheKey is stable across property insertion order', () => {
    const a = listCacheKey({ ...base({ status: ['TODO'], priority: ['HIGH'] }) });
    const b = listCacheKey({ ...base({ priority: ['HIGH'], status: ['TODO'] }) });
    expect(a).toBe(b);
  });

  it('listCacheKey ignores undefined-valued properties', () => {
    const a = listCacheKey(base({ status: ['TODO'] }));
    const b = listCacheKey({ ...base({ status: ['TODO'] }), q: undefined });
    expect(a).toBe(b);
  });

  it('listCacheKey distinguishes different filter values', () => {
    const a = listCacheKey(base({ status: ['TODO'] }));
    const b = listCacheKey(base({ status: ['DONE'] }));
    expect(a).not.toBe(b);
  });

  it('listCacheKey distinguishes different limits', () => {
    const a = listCacheKey(base({ limit: 20 }));
    const b = listCacheKey(base({ limit: 21 }));
    expect(a).not.toBe(b);
  });

  it('listCacheKey starts with the public list prefix', () => {
    const k = listCacheKey(base());
    expect(k.startsWith(LIST_KEY_PREFIX)).toBe(true);
  });

  it('itemCacheKey is namespaced and includes the id', () => {
    expect(itemCacheKey('cmoy123')).toBe('tasks:item:cmoy123');
  });
});

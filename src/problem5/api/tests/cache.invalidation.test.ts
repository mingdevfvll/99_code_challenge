import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp } from './helpers/test-app.js';
import { seedTask } from './helpers/factories.js';
import { redis } from '../src/core/lib/redis.js';

const app = getTestApp();

// These tests exercise the cache via real Redis, then peek at keys to confirm
// the service writes and invalidates as documented in `docs/06-observability.md`
// and `docs/02-architecture.md`.

async function cacheSize(prefix: string): Promise<number> {
  const keys = await redis.keys(`${prefix}*`);
  return keys.length;
}

describe('cache invalidation', () => {
  it('list endpoint writes a list cache entry on cold read', async () => {
    await seedTask();
    expect(await cacheSize('tasks:list:')).toBe(0);

    await request(app).get('/api/v1/tasks').expect(200);

    expect(await cacheSize('tasks:list:')).toBeGreaterThan(0);
  });

  it('item endpoint writes an item cache entry', async () => {
    const t = await seedTask();
    expect(await redis.exists(`tasks:item:${t.id}`)).toBe(0);

    await request(app).get(`/api/v1/tasks/${t.id}`).expect(200);

    expect(await redis.exists(`tasks:item:${t.id}`)).toBe(1);
  });

  it('create wipes list cache', async () => {
    await seedTask();
    await request(app).get('/api/v1/tasks').expect(200);
    expect(await cacheSize('tasks:list:')).toBeGreaterThan(0);

    await request(app).post('/api/v1/tasks').send({ title: 'New' }).expect(201);

    expect(await cacheSize('tasks:list:')).toBe(0);
  });

  it('update wipes both item cache and list cache', async () => {
    const t = await seedTask();
    await request(app).get(`/api/v1/tasks/${t.id}`).expect(200);
    await request(app).get('/api/v1/tasks').expect(200);
    expect(await redis.exists(`tasks:item:${t.id}`)).toBe(1);
    expect(await cacheSize('tasks:list:')).toBeGreaterThan(0);

    await request(app)
      .patch(`/api/v1/tasks/${t.id}`)
      .send({ status: 'DONE' })
      .expect(200);

    expect(await redis.exists(`tasks:item:${t.id}`)).toBe(0);
    expect(await cacheSize('tasks:list:')).toBe(0);
  });

  it('delete wipes both caches', async () => {
    const t = await seedTask();
    await request(app).get(`/api/v1/tasks/${t.id}`).expect(200);
    await request(app).get('/api/v1/tasks').expect(200);

    await request(app).delete(`/api/v1/tasks/${t.id}`).expect(204);

    expect(await redis.exists(`tasks:item:${t.id}`)).toBe(0);
    expect(await cacheSize('tasks:list:')).toBe(0);
  });

  it('repeated identical list reads hit the cache (single key)', async () => {
    await seedTask();
    await request(app).get('/api/v1/tasks?status=TODO').expect(200);
    await request(app).get('/api/v1/tasks?status=TODO').expect(200);
    await request(app).get('/api/v1/tasks?status=TODO').expect(200);
    // Same filters → same key.
    expect(await cacheSize('tasks:list:')).toBe(1);
  });
});

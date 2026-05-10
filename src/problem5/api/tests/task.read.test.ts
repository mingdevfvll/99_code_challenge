import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp } from './helpers/test-app.js';
import { seedTask } from './helpers/factories.js';

const app = getTestApp();

describe('GET /api/v1/tasks/:id', () => {
  it('returns a task and an ETag header', async () => {
    const t = await seedTask({ title: 'Read me' });
    const res = await request(app).get(`/api/v1/tasks/${t.id}`).expect(200);
    expect(res.body.data.id).toBe(t.id);
    expect(res.headers.etag).toMatch(/^"[a-f0-9]+"$/);
  });

  it('returns 304 when If-None-Match matches', async () => {
    const t = await seedTask();
    const first = await request(app).get(`/api/v1/tasks/${t.id}`).expect(200);
    const etag = first.headers.etag ?? '';
    expect(etag).not.toBe('');

    await request(app)
      .get(`/api/v1/tasks/${t.id}`)
      .set('If-None-Match', etag)
      .expect(304);
  });

  it('returns 200 when If-None-Match does not match', async () => {
    const t = await seedTask();
    await request(app)
      .get(`/api/v1/tasks/${t.id}`)
      .set('If-None-Match', '"not-the-real-etag"')
      .expect(200);
  });

  it('returns 404 NOT_FOUND for unknown id', async () => {
    // Valid cuid shape but no row.
    const res = await request(app)
      .get('/api/v1/tasks/cmoyzzzzzzzzzzzzzzzzzzzzz')
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 VALIDATION_ERROR for malformed id', async () => {
    const res = await request(app).get('/api/v1/tasks/not-a-cuid').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp } from './helpers/test-app.js';
import { seedTask } from './helpers/factories.js';

const app = getTestApp();

describe('DELETE /api/v1/tasks/:id', () => {
  it('returns 204 with no body and removes the row', async () => {
    const t = await seedTask();
    const res = await request(app).delete(`/api/v1/tasks/${t.id}`).expect(204);
    expect(res.body).toEqual({});

    await request(app).get(`/api/v1/tasks/${t.id}`).expect(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .delete('/api/v1/tasks/cmoyzzzzzzzzzzzzzzzzzzzzz')
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('is non-idempotent — second delete also 404 (documented behavior)', async () => {
    const t = await seedTask();
    await request(app).delete(`/api/v1/tasks/${t.id}`).expect(204);
    await request(app).delete(`/api/v1/tasks/${t.id}`).expect(404);
  });
});

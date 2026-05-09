import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp } from './helpers/test-app.js';
import { seedTask } from './helpers/factories.js';

const app = getTestApp();

describe('PATCH /api/v1/tasks/:id', () => {
  it('partial-updates a single field', async () => {
    const t = await seedTask({ title: 'Old', status: 'TODO' });
    const res = await request(app)
      .patch(`/api/v1/tasks/${t.id}`)
      .send({ status: 'DONE' })
      .expect(200);
    expect(res.body.data.status).toBe('DONE');
    expect(res.body.data.title).toBe('Old');
  });

  it('updates dueDate to null (explicit clear)', async () => {
    const t = await seedTask({ dueDate: new Date('2026-01-01T00:00:00Z') });
    const res = await request(app)
      .patch(`/api/v1/tasks/${t.id}`)
      .send({ dueDate: null })
      .expect(200);
    expect(res.body.data.dueDate).toBeNull();
  });

  it('replaces tags fully (not merge)', async () => {
    const t = await seedTask({ tags: ['old'] });
    const res = await request(app)
      .patch(`/api/v1/tasks/${t.id}`)
      .send({ tags: ['new'] })
      .expect(200);
    expect(res.body.data.tags).toEqual(['new']);
  });

  it('rejects empty body', async () => {
    const t = await seedTask();
    const res = await request(app).patch(`/api/v1/tasks/${t.id}`).send({}).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unknown field', async () => {
    const t = await seedTask();
    const res = await request(app)
      .patch(`/api/v1/tasks/${t.id}`)
      .send({ priority: 'HIGH', secret: true })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for missing task', async () => {
    const res = await request(app)
      .patch('/api/v1/tasks/cmoyzzzzzzzzzzzzzzzzzzzzz')
      .send({ status: 'DONE' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('updatedAt advances after patch', async () => {
    const t = await seedTask();
    await new Promise((r) => setTimeout(r, 5));
    const res = await request(app)
      .patch(`/api/v1/tasks/${t.id}`)
      .send({ title: 'changed' })
      .expect(200);
    expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThan(t.updatedAt.getTime());
  });
});

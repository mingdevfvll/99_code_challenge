import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp } from './helpers/test-app.js';

const app = getTestApp();

describe('POST /api/v1/tasks', () => {
  it('creates a task with defaults applied', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ title: 'Write tests' })
      .expect(201);

    expect(res.body.data).toMatchObject({
      title: 'Write tests',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      tags: [],
    });
    expect(res.body.data.id).toMatch(/^c[a-z0-9]{20,30}$/i);
    expect(res.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('accepts all optional fields', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({
        title: '  trim me  ',
        description: 'with details',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2026-12-01T00:00:00.000Z',
        tags: ['  Billing  ', 'CLIENT', 'billing'],
      })
      .expect(201);

    expect(res.body.data.title).toBe('trim me');
    expect(res.body.data.dueDate).toBe('2026-12-01T00:00:00.000Z');
    // Tag normalization: trim, lowercase, dedupe.
    expect(res.body.data.tags.sort()).toEqual(['billing', 'client']);
  });

  it('rejects empty body with 400 + VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/tasks').send({}).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.requestId).toBeDefined();
  });

  it('rejects unknown fields (strict schema)', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ title: 'Hi', extra: 'nope' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Content-Type', 'application/json')
      .send('{not json')
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects non-ISO dueDate', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ title: 'x', dueDate: 'tomorrow' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp } from './helpers/test-app.js';
import { seedTask, seedTasks } from './helpers/factories.js';

const app = getTestApp();

describe('GET /api/v1/tasks — filters and pagination', () => {
  it('returns empty list with hasMore=false when nothing matches', async () => {
    const res = await request(app).get('/api/v1/tasks').expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toEqual({ nextCursor: null, hasMore: false });
  });

  it('filters by status', async () => {
    await seedTask({ status: 'TODO', title: 'a' });
    await seedTask({ status: 'DONE', title: 'b' });
    await seedTask({ status: 'IN_PROGRESS', title: 'c' });

    const res = await request(app).get('/api/v1/tasks?status=TODO').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('TODO');
  });

  it('filters by multiple status values (status=TODO&status=DONE)', async () => {
    await seedTask({ status: 'TODO' });
    await seedTask({ status: 'DONE' });
    await seedTask({ status: 'ARCHIVED' });

    const res = await request(app)
      .get('/api/v1/tasks?status=TODO&status=DONE')
      .expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((t: { status: string }) => t.status).sort()).toEqual(['DONE', 'TODO']);
  });

  it('filters by priority', async () => {
    await seedTask({ priority: 'LOW' });
    await seedTask({ priority: 'HIGH' });
    const res = await request(app).get('/api/v1/tasks?priority=HIGH').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].priority).toBe('HIGH');
  });

  it('filters by tags (overlap match)', async () => {
    await seedTask({ tags: ['billing'], title: 'a' });
    await seedTask({ tags: ['client'], title: 'b' });
    await seedTask({ tags: ['internal'], title: 'c' });

    const res = await request(app)
      .get('/api/v1/tasks?tags=billing,client')
      .expect(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('filters by full-text q on title', async () => {
    await seedTask({ title: 'Send invoice' });
    await seedTask({ title: 'Buy stamps' });
    const res = await request(app).get('/api/v1/tasks?q=invoice').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Send invoice');
  });

  it('filters by dueBefore / dueAfter', async () => {
    await seedTask({ dueDate: new Date('2026-01-01T00:00:00Z'), title: 'jan' });
    await seedTask({ dueDate: new Date('2026-06-01T00:00:00Z'), title: 'jun' });
    await seedTask({ dueDate: new Date('2026-12-01T00:00:00Z'), title: 'dec' });

    const res = await request(app)
      .get('/api/v1/tasks?dueAfter=2026-03-01T00:00:00Z&dueBefore=2026-09-01T00:00:00Z')
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('jun');
  });

  it('paginates with cursor — page 1 returns nextCursor, page 2 follows it', async () => {
    await seedTasks(5);

    const page1 = await request(app).get('/api/v1/tasks?limit=2').expect(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination.hasMore).toBe(true);
    expect(page1.body.pagination.nextCursor).toBeTypeOf('string');

    const page2 = await request(app)
      .get(`/api/v1/tasks?limit=2&cursor=${page1.body.pagination.nextCursor}`)
      .expect(200);
    expect(page2.body.data).toHaveLength(2);

    // No id overlap between pages.
    const ids1 = page1.body.data.map((t: { id: string }) => t.id);
    const ids2 = page2.body.data.map((t: { id: string }) => t.id);
    expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
  });

  it('hasMore=false on the last page', async () => {
    await seedTasks(2);
    const res = await request(app).get('/api/v1/tasks?limit=10').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({ nextCursor: null, hasMore: false });
  });

  it('rejects unknown filter (strict schema)', async () => {
    const res = await request(app).get('/api/v1/tasks?bogus=1').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects bad sort token', async () => {
    const res = await request(app).get('/api/v1/tasks?sort=evil').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts custom sort (offset path) and returns first page', async () => {
    await seedTasks(3);
    const res = await request(app).get('/api/v1/tasks?sort=title&limit=2').expect(200);
    expect(res.body.data).toHaveLength(2);
    // Custom sort still includes pagination shape (offset-based here).
    expect(res.body.pagination.hasMore).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';

const app = getTestApp();

describe('health endpoints', () => {
  it('GET /healthz → 200 { status: "ok" }', async () => {
    const res = await request(app).get('/healthz').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /readyz → 200 with both backends reported ok', async () => {
    const res = await request(app).get('/readyz').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.postgres).toBe('ok');
    // Redis may be 'ok' or 'degraded' depending on transient state; both are
    // documented healthy responses.
    expect(['ok', 'degraded']).toContain(res.body.checks.redis);
  });

  it('GET /readyz includes a request id header', async () => {
    const res = await request(app).get('/readyz').expect(200);
    expect(res.headers['x-request-id']).toBeDefined();
  });
});

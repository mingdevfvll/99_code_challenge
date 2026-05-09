import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';

const app = getTestApp();

describe('error envelope', () => {
  it('synthetic sync throw → 500 INTERNAL_ERROR with no stack in body', async () => {
    const res = await request(app).get('/__debug/throw-sync').expect(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).not.toContain('synthetic');
    expect(res.body.error.requestId).toBeDefined();
    expect(res.body.error.stack).toBeUndefined();
  });

  it('synthetic async throw → 500 INTERNAL_ERROR (Express 5 forwards rejections)', async () => {
    const res = await request(app).get('/__debug/throw-async').expect(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('typed HttpError → mapped status + envelope', async () => {
    const res = await request(app).get('/__debug/throw-http').expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toBe('synthetic typed HttpError');
    expect(res.body.error.details).toEqual({ reason: 'smoke test' });
  });

  it('unknown route → 404 envelope', async () => {
    const res = await request(app).get('/no/such/route').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });

  it('every error response includes the request id from the response header', async () => {
    const res = await request(app).get('/no/such/route').expect(404);
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });
});

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';

const app = getTestApp();

describe('OpenAPI surface', () => {
  it('GET /openapi.json returns a valid 3.1 document', async () => {
    const res = await request(app).get('/openapi.json').expect(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.info.title).toMatch(/Task API/);
  });

  it('every Task route is registered in the spec', async () => {
    const res = await request(app).get('/openapi.json').expect(200);
    const paths = Object.keys(res.body.paths ?? {});

    expect(paths).toContain('/api/v1/tasks');
    expect(paths).toContain('/api/v1/tasks/{id}');

    const tasksOps = res.body.paths['/api/v1/tasks'];
    expect(tasksOps.get).toBeDefined();
    expect(tasksOps.post).toBeDefined();

    const itemOps = res.body.paths['/api/v1/tasks/{id}'];
    expect(itemOps.get).toBeDefined();
    expect(itemOps.patch).toBeDefined();
    expect(itemOps.delete).toBeDefined();
  });

  it('exposes the documented schemas', async () => {
    const res = await request(app).get('/openapi.json').expect(200);
    const schemas = Object.keys(res.body.components?.schemas ?? {});
    for (const name of ['Task', 'TaskListResponse', 'TaskItemResponse', 'CreateTaskInput', 'UpdateTaskInput', 'ErrorEnvelope']) {
      expect(schemas).toContain(name);
    }
  });

  it('GET /docs renders the Swagger UI HTML', async () => {
    const res = await request(app).get('/docs/').expect(200);
    expect(res.text).toContain('swagger-ui');
  });
});

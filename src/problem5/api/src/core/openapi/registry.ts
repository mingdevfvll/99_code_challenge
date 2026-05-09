import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod once at module load. Imports of `z` after this point gain a
// `.openapi()` method on schemas. Any module that registers a schema with
// the registry must import this file first (transitively or directly).

extendZodWithOpenApi(z);

export const registry: OpenAPIRegistry = new OpenAPIRegistry();

// The error envelope is the same shape for every endpoint. Defined once
// here so per-route error responses can reference it instead of repeating.
export const errorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: 'NOT_FOUND' }),
      message: z.string().openapi({ example: 'Resource not found' }),
      requestId: z.string().openapi({ example: '1f2c-…' }),
      details: z.unknown().optional(),
    }),
  })
  .openapi('ErrorEnvelope');

registry.register('ErrorEnvelope', errorResponseSchema);

export function buildSpec() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Problem 5 — Task API',
      version: '1.0.0',
      description:
        'CRUD over a Task resource. Generated from the same Zod schemas the request validator uses, so the spec cannot drift from the implementation.',
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local Docker' }],
    tags: [
      { name: 'Tasks', description: 'Task CRUD' },
      { name: 'Health', description: 'Liveness + readiness' },
    ],
  });
}

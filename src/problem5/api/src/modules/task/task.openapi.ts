import { z } from 'zod';
import { registry, errorResponseSchema } from '../../core/openapi/registry.js';
import {
  createTaskSchema,
  listTaskQuerySchema,
  taskIdParamSchema,
  taskStatusEnum,
  taskPriorityEnum,
  updateTaskSchema,
} from './task.schema.js';

// Path operations for the Task module. The schemas are reused as-is; only
// here do we add OpenAPI-specific decoration (examples, descriptions).

const taskResponseSchema = z
  .object({
    id: z.string().openapi({ example: 'cmoy8m7w100003fas81o620t1' }),
    title: z.string().openapi({ example: 'Send invoice to Acme' }),
    description: z.string().nullable().openapi({ example: 'Net 30, attach W-9.' }),
    status: taskStatusEnum,
    priority: taskPriorityEnum,
    dueDate: z.string().nullable().openapi({ example: '2026-06-01T00:00:00.000Z' }),
    tags: z.array(z.string()).openapi({ example: ['billing', 'client'] }),
    createdAt: z.string().openapi({ example: '2026-05-09T17:30:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-05-09T17:30:00.000Z' }),
  })
  .openapi('Task');

const taskListResponseSchema = z
  .object({
    data: z.array(taskResponseSchema),
    pagination: z.object({
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
    }),
  })
  .openapi('TaskListResponse');

const taskItemResponseSchema = z
  .object({ data: taskResponseSchema })
  .openapi('TaskItemResponse');

registry.register('Task', taskResponseSchema);
registry.register('TaskListResponse', taskListResponseSchema);
registry.register('TaskItemResponse', taskItemResponseSchema);
registry.register('CreateTaskInput', createTaskSchema);
registry.register('UpdateTaskInput', updateTaskSchema);

const errorJson = (description: string) => ({
  description,
  content: { 'application/json': { schema: errorResponseSchema } },
});

const TASKS_BASE = '/api/v1/tasks';

registry.registerPath({
  method: 'post',
  path: TASKS_BASE,
  summary: 'Create a task',
  tags: ['Tasks'],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: createTaskSchema } },
    },
  },
  responses: {
    201: {
      description: 'Created',
      content: { 'application/json': { schema: taskItemResponseSchema } },
    },
    400: errorJson('Validation error'),
    429: errorJson('Rate limit exceeded'),
  },
});

registry.registerPath({
  method: 'get',
  path: TASKS_BASE,
  summary: 'List tasks with filters and cursor pagination',
  tags: ['Tasks'],
  request: { query: listTaskQuerySchema },
  responses: {
    200: {
      description: 'Task list',
      content: { 'application/json': { schema: taskListResponseSchema } },
    },
    400: errorJson('Invalid query'),
  },
});

registry.registerPath({
  method: 'get',
  path: `${TASKS_BASE}/{id}`,
  summary: 'Get one task by id',
  tags: ['Tasks'],
  request: { params: taskIdParamSchema },
  responses: {
    200: {
      description: 'Task',
      content: { 'application/json': { schema: taskItemResponseSchema } },
    },
    304: { description: 'Not modified (matched If-None-Match)' },
    404: errorJson('Task not found'),
  },
});

registry.registerPath({
  method: 'patch',
  path: `${TASKS_BASE}/{id}`,
  summary: 'Partially update a task',
  tags: ['Tasks'],
  request: {
    params: taskIdParamSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: updateTaskSchema } },
    },
  },
  responses: {
    200: {
      description: 'Updated task',
      content: { 'application/json': { schema: taskItemResponseSchema } },
    },
    400: errorJson('Validation error'),
    404: errorJson('Task not found'),
  },
});

registry.registerPath({
  method: 'delete',
  path: `${TASKS_BASE}/{id}`,
  summary: 'Delete a task',
  tags: ['Tasks'],
  request: { params: taskIdParamSchema },
  responses: {
    204: { description: 'Deleted' },
    404: errorJson('Task not found'),
  },
});

// Health endpoints — included so the spec page is the single contract.
registry.registerPath({
  method: 'get',
  path: '/healthz',
  summary: 'Liveness',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Process is up',
      content: {
        'application/json': {
          schema: z.object({ status: z.literal('ok') }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/readyz',
  summary: 'Readiness (Postgres + Redis)',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Ready (Redis may be reported as degraded)',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok'),
            checks: z.object({
              postgres: z.literal('ok'),
              redis: z.enum(['ok', 'degraded']),
            }),
          }),
        },
      },
    },
    503: {
      description: 'Not ready (Postgres unreachable)',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('not_ready'),
            checks: z.object({
              postgres: z.enum(['down']),
              redis: z.enum(['ok', 'down']),
            }),
          }),
        },
      },
    },
  },
});

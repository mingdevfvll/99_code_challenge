import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import type { Task as PrismaTask } from '@prisma/client';
import { getValidated } from '../../core/middleware/validate.js';
import { taskService } from './task.service.js';
import type {
  CreateTaskInput,
  ListTaskQuery,
  TaskIdParam,
  UpdateTaskInput,
} from './task.schema.js';

// HTTP shape lives here. Status codes, envelope, headers, ETag — nothing
// business-y. Service throws domain errors; the global error handler
// translates them.

export const taskController = {
  async create(req: Request, res: Response) {
    const input = getValidated<CreateTaskInput>(req, 'body');
    const task = await taskService.create(input);
    res.status(201).json({ data: toResponse(task) });
  },

  async list(req: Request, res: Response) {
    const filters = getValidated<ListTaskQuery>(req, 'query');
    const { tasks, nextCursor } = await taskService.list(filters);
    res.status(200).json({
      data: tasks.map(toResponse),
      pagination: { nextCursor, hasMore: nextCursor !== null },
    });
  },

  async getById(req: Request, res: Response) {
    const { id } = getValidated<TaskIdParam>(req, 'params');
    const task = await taskService.getById(id);
    const body = { data: toResponse(task) };
    const etag = `"${etagOf(body)}"`;

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', etag);
    res.status(200).json(body);
  },

  async update(req: Request, res: Response) {
    const { id } = getValidated<TaskIdParam>(req, 'params');
    const input = getValidated<UpdateTaskInput>(req, 'body');
    const task = await taskService.update(id, input);
    res.status(200).json({ data: toResponse(task) });
  },

  async delete(req: Request, res: Response) {
    const { id } = getValidated<TaskIdParam>(req, 'params');
    await taskService.delete(id);
    res.status(204).end();
  },
};

// Explicit response shape. No `res.json(rowFromPrisma)` anywhere — see
// `docs/13-security.md` ("Output discipline").
//
// Accepts string-typed dates as well as Date instances: cache hits come back
// from JSON.parse with string timestamps, fresh DB rows have Date instances.
function toResponse(t: PrismaTask) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: toIso(t.dueDate),
    tags: t.tags,
    createdAt: toIso(t.createdAt) as string,
    updatedAt: toIso(t.updatedAt) as string,
  };
}

function toIso(v: Date | string | null): string | null {
  if (v === null) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function etagOf(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 32);
}

import { Router } from 'express';
import { validate } from '../../core/middleware/validate.js';
import { taskController } from './task.controller.js';
import {
  createTaskSchema,
  listTaskQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from './task.schema.js';

// Routes mounted at /api/v1/tasks (see server.ts). Validate middleware runs
// before each handler so handlers see typed, parsed input only.

const router: Router = Router();

router.post(
  '/',
  validate(createTaskSchema, 'body'),
  taskController.create,
);

router.get(
  '/',
  validate(listTaskQuerySchema, 'query'),
  taskController.list,
);

router.get(
  '/:id',
  validate(taskIdParamSchema, 'params'),
  taskController.getById,
);

router.patch(
  '/:id',
  validate(taskIdParamSchema, 'params'),
  validate(updateTaskSchema, 'body'),
  taskController.update,
);

router.delete(
  '/:id',
  validate(taskIdParamSchema, 'params'),
  taskController.delete,
);

export { router as taskRoutes };

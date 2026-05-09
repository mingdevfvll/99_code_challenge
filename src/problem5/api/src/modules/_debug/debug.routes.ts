import { Router } from 'express';
import { HttpError } from '../../core/errors/http-errors.js';

// Debug-only routes for verifying the error envelope shape. Mounted from
// server.ts only when NODE_ENV !== 'production'. Decision pending in
// `docs/11-decisions.md` ("what I haven't decided yet") on whether to remove
// before Phase 8 or keep gated.

const router: Router = Router();

router.get('/__debug/throw-sync', () => {
  throw new Error('synthetic sync failure for error-handler smoke test');
});

router.get('/__debug/throw-async', async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('synthetic async failure for error-handler smoke test');
});

router.get('/__debug/throw-http', () => {
  throw new HttpError({
    code: 'CONFLICT',
    statusCode: 409,
    message: 'synthetic typed HttpError',
    details: { reason: 'smoke test' },
  });
});

export { router as debugRoutes };

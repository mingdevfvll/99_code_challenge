// Augments Express's Request with our middleware-attached fields.
// Imported via the `include` glob in tsconfig; nothing else needs to import it.

import 'express';

declare global {
  namespace Express {
    interface Request {
      id: string;
      // Express 5 made req.query / req.params readonly getters. The validate
      // middleware writes Zod-parsed (and transformed) values here so handlers
      // see typed input without fighting the Express type.
      validated: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};

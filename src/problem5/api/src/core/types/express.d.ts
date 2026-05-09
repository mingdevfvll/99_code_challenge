// Augments Express's Request with the request id we attach in middleware.
// Imported via the `include` glob in tsconfig; nothing else needs to import it.

import 'express';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export {};

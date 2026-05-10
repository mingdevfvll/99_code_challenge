import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import { buildSpec } from './registry.js';
// Side-effect import: registers Task path operations with the registry.
import '../../modules/task/task.openapi.js';

// Build once at boot. Schemas don't change at runtime.
const spec = buildSpec();

const router: Router = Router();

// Swagger UI loads inline scripts + styles. Loosen CSP just for these routes,
// the rest of the app keeps the helmet defaults from createApp().
const docsCsp = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
    imgSrc: ["'self'", 'data:', 'https:'],
  },
});

router.get('/openapi.json', (_req, res) => {
  res.status(200).json(spec);
});

router.use('/docs', docsCsp, swaggerUi.serveFiles(spec, {}), swaggerUi.setup(spec, {
  customSiteTitle: 'Problem 5 — Task API',
  swaggerOptions: {
    persistAuthorization: false,
    displayRequestDuration: true,
    docExpansion: 'list',
  },
}));

export { router as docsRoutes };

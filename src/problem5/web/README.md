# web — Next.js 15

Frontend for Problem 5. Next.js 15 App Router on React 19, shadcn/ui on Tailwind 3, TanStack Query for data, RHF + Zod for forms.

## Status

Phase 1 scaffolding placeholder. The real Next.js project gets initialized in Phase 5 via:

```bash
# from src/problem5/, with this folder removed first
npx create-next-app@latest web \
  --typescript --tailwind --eslint --app --no-src-dir \
  --import-alias "@/*" --use-npm
```

Then shadcn primitives + the dependencies listed in `../docs/09-tasks.md` (Phase 5).

## Why empty now

Bootstrapping Next.js with `create-next-app` writes ~30 generated files (config, lockfile, sample app). Committing those before the rest of the work just adds noise. This README and the `.gitignore` are the only files that exist in Phase 1.

See `../docs/05-frontend-design.md` for the page composition that will live here.

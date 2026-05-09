# web — Next.js 16

Frontend for Problem 5. Next.js 16 (App Router) on React 19, shadcn/ui on
Tailwind 4, TanStack Query for server state, RHF + Zod for forms.

> Plan and component breakdown live in `../docs/05-frontend-design.md`.

## Run it

```bash
cp .env.example .env.local       # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                      # http://localhost:3000 → /tasks
```

The dev server expects the API on `NEXT_PUBLIC_API_URL`. Start it from
`../api/` first (`npm run dev`) — see `../README.md` for the full quickstart.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm start` | Run the production build. |
| `npm run lint` | ESLint via the Next config. |

## Layout

```
app/
├── layout.tsx          ← providers, fonts, toaster
├── providers.tsx       ← ThemeProvider + QueryClientProvider + TooltipProvider
├── page.tsx            ← redirects to /tasks
└── tasks/
    └── page.tsx        ← Phase 5 shell, Phase 6+ adds table + filters

components/
├── ui/                 ← shadcn primitives (button, dialog, input, …)
└── theme-toggle.tsx

lib/
├── api-client.ts       ← typed fetch wrapper, ApiError, request id
├── env.ts              ← NEXT_PUBLIC_* access with fail-fast guard
├── format-date.ts      ← shared Intl.DateTimeFormat
├── query-client.ts     ← QueryClient factory, retry/staleTime defaults
└── utils.ts            ← shadcn cn() helper
```

## Notes

- Versions came out slightly ahead of the original plan: Next 16 (vs. 15),
  Tailwind 4 (vs. 3), React 19. Same architecture, no contract change.
  Documented in `../docs/12-retrospective.md`.
- `.env.local` is gitignored. `.env.example` is the source of truth for
  what the app needs at boot.

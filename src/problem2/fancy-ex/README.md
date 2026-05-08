# Fancy Ex Currency Swap

Frontend-only currency swap form built with Vite, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, and Zod.

## Setup

```bash
npm install
npm run dev
```

The dev server starts from this project directory and serves the app with Vite.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

`npm run typecheck` runs `tsc --noEmit`. `npm run build` also runs TypeScript project checks before creating the production bundle.

## Token Icons

Token icons are served locally from `public/images/` using the filename pattern `{SYMBOL}.svg`, for example `public/images/ETH.svg`.

Do not fetch token icons from external URLs at runtime. If an SVG is missing, the app renders a fallback avatar with the token's first letter.

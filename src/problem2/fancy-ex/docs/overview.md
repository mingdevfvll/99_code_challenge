# OVERVIEW — Problem 2: Fancy Form (Currency Swap)

> This document is the single source of truth for AI Agents working on this project.
> Read this entirely before writing any code. Do not deviate from the rules below.

---

## 1. Problem Summary

Build a **currency swap form** — a frontend-only web application that allows a user to:

- Select a **source token** (FROM)
- Enter an **amount** to swap
- Select a **destination token** (TO)
- See the **computed output amount** in real time based on live exchange rates
- Submit the swap (mock interaction — no real blockchain call)

This is a UI/UX and frontend engineering challenge. Points are awarded for:
1. Accurately identifying and solving computational/logic requirements
2. Visual attractiveness and usage intuitiveness
3. Code quality, structure, and maintainability

---

## 2. External Data Sources

### Token Prices
```
URL: https://interview.switcheo.com/prices.json
```

Shape of each entry:
```json
{ "currency": "ETH", "date": "2023-08-29T07:10:40.000Z", "price": 1645.9 }
```

Rules:
- Fetch on app load
- Same `currency` may appear multiple times with different dates → **keep only the latest date entry**
- Tokens with no price entry must be **omitted** from the selector
- Exchange rate formula: `outputAmount = inputAmount * (fromPrice / toPrice)`

### Token Icons
```
Base path: /public/images/{SYMBOL}.svg
Example:   /public/images/ETH.svg
           /public/images/USDC.svg
```

Rules:
- Icons are pre-downloaded into `public/images/` — do not fetch from external URL at runtime
- If an icon file is missing (404), render a **fallback avatar**: colored circle with the first letter of the symbol
- Never show broken image tags

---

## 3. Tech Stack

| Layer | Choice |
|-------|--------|
| Build tool | Vite 5 (latest) |
| Framework | React 18 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v3 |
| UI Components | shadcn/ui (Input, Button, Popover, Command, Skeleton) |
| Dark mode | next-themes |
| Icons | lucide-react |
| Fonts | Google Fonts — Mukta Vaani + Pixelify Sans |

No other UI frameworks (no MUI, no Chakra, no Ant Design).

---

## 4. Design System

### Colors
```ts
// tailwind.config.ts — extend colors
primary:    '#f63d19'   // brand orange-red — buttons, accents, focus rings
background: '#ffffff'   // light mode bg  |  dark: '#0f1110'
foreground: '#131410'   // light mode text |  dark: '#f0f4f5'
muted:      '#d9e3e7'   // light mode muted|  dark: '#1e2a2e'
```

All colors must be defined as **CSS variables** in `index.css` and referenced via Tailwind custom tokens. Never hardcode hex values in component files.

### Typography
```
font-sans  → Mukta Vaani     — body text, labels, descriptions (80% of text)
font-mono  → Pixelify Sans   — numbers, token symbols, exchange rate display, headings (20%)
```

Import both from Google Fonts in `index.html`.

### Design Direction
- **Clean minimal** — inspired by Linear, Vercel dashboard
- Generous whitespace, sharp edges, no gradients on primary surfaces
- Subtle shadows on cards (`shadow-sm`)
- Smooth transitions: `transition-all duration-200`
- Dark mode must be fully supported — every color token must have a dark variant

---

## 5. Feature Requirements

### Core (required)
- [ ] Token selector (FROM): searchable dropdown with icon + symbol
- [ ] Amount input (FROM): numeric, validates positive number
- [ ] Token selector (TO): same as FROM selector
- [ ] Amount output (TO): read-only, auto-computed from exchange rate
- [ ] Swap direction button: click to flip FROM ↔ TO (with rotation animation)
- [ ] Exchange rate display: `1 ETH = 1,234.56 USDC`
- [ ] Submit button: triggers mock swap with loading state (1800ms timeout)
- [ ] Success state: inline confirmation message
- [ ] Error state: inline error message

### Validation (required)
- Amount must be a positive number (> 0)
- FROM and TO tokens must both be selected
- FROM and TO tokens must not be the same
- Show clear error messages — not just disable the button silently

### Edge Cases (required)
- prices.json fetch fails → show error state, disable form
- prices.json loading → show skeleton placeholders
- Token icon 404 → fallback letter avatar
- Very large or very small numbers → format with `toLocaleString` or similar

### Bonus
- [ ] Dark mode toggle (top-right, sun/moon icon)
- [ ] Responsive layout (min-width 320px)
- [ ] Smooth skeleton loading while prices fetch

---

## 6. Folder Structure

```
problem2/
├── public/
│   └── images/              # Pre-downloaded token SVGs (ETH.svg, USDC.svg, ...)
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn auto-generated base components (DO NOT EDIT)
│   │   ├── TokenSelector.tsx
│   │   ├── AmountInput.tsx
│   │   ├── SwapArrow.tsx
│   │   ├── ExchangeRate.tsx
│   │   ├── SwapForm.tsx     # Main form — composes all sub-components
│   │   └── ThemeToggle.tsx
│   ├── hooks/
│   │   └── usePrices.ts     # Fetch, deduplicate, and expose token list
│   ├── types/
│   │   └── index.ts         # All shared TypeScript interfaces and types
│   ├── lib/
│   │   └── utils.ts         # shadcn cn() utility + any shared helpers
│   ├── App.tsx              # Root — ThemeProvider + layout shell
│   ├── main.tsx             # Vite entry point
│   └── index.css            # Tailwind directives + CSS variables (light/dark)
├── index.html               # Google Fonts import here
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 7. Code Rules

### TypeScript
- `strict: true` in tsconfig — no implicit `any`, no `as any` casts
- All props must be typed via `interface` — no inline object type literals in JSX
- All API response shapes must be typed — never use `any` for fetch responses
- Use `type` for unions/primitives, `interface` for object shapes

### React
- Functional components only — no class components
- Every `useMemo` and `useCallback` must have a comment explaining why it is memoized
- No business logic inside JSX — extract to variables or hooks
- `key` props must use stable unique identifiers — never array index
- Avoid prop drilling beyond 2 levels — lift state or use context

### Styling
- Tailwind utility classes only — no inline `style={{}}` except for truly dynamic values (e.g. calculated widths)
- All custom colors via CSS variables — never hardcode hex in className
- Dark mode via `dark:` Tailwind variant — never via JS conditional class strings
- Component-level spacing owned by the component — parent does not set margins on children

### File Conventions
- One component per file
- File name = component name (PascalCase): `SwapForm.tsx`
- Hook files: camelCase prefixed with `use`: `usePrices.ts`
- No barrel `index.ts` re-exports unless the directory has 4+ files
- Imports order: React → third-party → internal (types → hooks → components → utils)

### Commits (if applicable)
```
feat: add TokenSelector with icon fallback
fix: deduplicate prices by latest date
refactor: extract exchange rate logic to usePrices hook
```

---

## 8. What NOT to Do

- Do not use `any` type anywhere
- Do not fetch token icons from external URLs at runtime
- Do not use `index` as React `key`
- Do not put business logic (price calculation, validation) inside JSX
- Do not use MUI, Chakra, Ant Design, or any non-shadcn component library
- Do not hardcode prices or token lists — always derive from the API response
- Do not skip dark mode — every UI state must have a dark variant
- Do not use `useEffect` for derived state — use `useMemo`
- Do not ignore loading and error states — both must be handled visually

---

## 9. Acceptance Criteria

The submission passes if:

1. `npm install && npm run dev` starts without errors
2. Token list loads from `prices.json` and deduplication is correct
3. Exchange rate computes correctly: `output = input * (fromPrice / toPrice)`
4. Validation blocks submit with clear error messages
5. Mock swap shows loading → success/error state
6. Dark mode toggle works and persists
7. No TypeScript errors (`npm run tsc --noEmit` passes)
8. Responsive on 320px viewport
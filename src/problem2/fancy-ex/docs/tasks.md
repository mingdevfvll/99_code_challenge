# TASKS — Problem 2: Fancy Form (Currency Swap)

> Implementation task list for AI Agents.
> Read OVERVIEW.md and UI_BRIEF.md before starting any task.
> Tasks must be completed in order — each task builds on the previous.

---

## Language (Source Code & Copy)

1. **English only in source:** All code (identifiers where appropriate), comments, JSDoc, commit messages for this work, and **all user-visible strings** (labels, buttons, toasts, errors, placeholders) must be written in **English** using **US English conventions** (California / general American English spelling and punctuation). Do not use Vietnamese or any other human language in repository source files for this project.

---

## Reference Files
- `OVERVIEW.md` — project context, data sources, folder structure, code rules
- `UI_BRIEF.md` — color tokens, typography, component specs, animation specs

## Source Template
The provided HTML template is minimal intentional scaffolding:
```html
<form onsubmit="return !1">
  <h5>Swap</h5>
  <label for="input-amount">Amount to send</label>
  <input id="input-amount" />
  <label for="output-amount">Amount to receive</label>
  <input id="output-amount" />
  <button>CONFIRM SWAP</button>
</form>
```
Discard the raw HTML structure entirely. Rebuild as a React + TypeScript application.
The template only communicates: a swap form with input amount, output amount, and a confirm button.

---

## Third-Party Libraries

Install all of the following. Each has a specific role — do not substitute.

```bash
npm install \
  @tanstack/react-query \
  react-hook-form \
  zod \
  @hookform/resolvers \
  framer-motion \
  number-flow \
  sonner \
  canvas-confetti \
  @types/canvas-confetti \
  next-themes \
  lucide-react \
  clsx \
  tailwind-merge
```

| Library | Role |
|---------|------|
| `@tanstack/react-query` | Fetch + cache `prices.json`. Handles loading/error/stale states automatically |
| `react-hook-form` | Form state management — no manual `useState` for inputs |
| `zod` | Validation schema — type-safe, co-located with form |
| `@hookform/resolvers` | Bridge between zod and react-hook-form |
| `framer-motion` | Page entrance, stagger, layout animations, swap arrow rotation |
| `number-flow` | Animated number transitions when exchange rate or output amount changes |
| `sonner` | Toast notifications for swap success/error (shadcn-native) |
| `canvas-confetti` | One-shot confetti burst on successful swap — unexpected delight |
| `next-themes` | Dark mode with class strategy, no flash on load |

---

## TASK 1 — Project Scaffold

**Goal:** Working Vite + React + TypeScript project that compiles with `npm run dev`.

Steps:
1. Init: `npm create vite@latest problem2 -- --template react-ts`
2. Install all libraries listed above
3. Install and configure Tailwind CSS v3:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
4. Configure `tailwind.config.ts`:
   - `content`: include `./index.html` and `./src/**/*.{ts,tsx}`
   - `darkMode`: `'class'`
   - Extend `colors` with all tokens from UI_BRIEF Section 2
   - Extend `fontFamily`: `sans: ['"Mukta Vaani"', 'sans-serif']`, `mono: ['"Pixelify Sans"', 'monospace']`
5. Install shadcn: `npx shadcn-ui@latest init`
   - Style: `default`, base color: `neutral`, CSS variables: `yes`
   - Add components: `npx shadcn-ui@latest add button input popover command skeleton`
6. Add Google Fonts to `index.html` `<head>` (Mukta Vaani + Pixelify Sans, weights 400/500/600/700)
7. Set up `src/index.css`:
   - Tailwind directives
   - All CSS variables from UI_BRIEF Section 2 (`:root` and `.dark`)
   - `body { font-family: 'Mukta Vaani', sans-serif; background: var(--color-bg); color: var(--color-fg); }`
   - Dot-grid background pattern class `.bg-grid`
   - `transition-colors duration-200` on `html` for smooth theme switch
8. Wrap `main.tsx`:
   ```tsx
   <QueryClientProvider client={queryClient}>
     <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
       <App />
       <Toaster richColors position="top-right" />
     </ThemeProvider>
   </QueryClientProvider>
   ```

**Output:** `npm run dev` starts. Page renders empty with correct background color in light and dark mode.

---

## TASK 2 — Types

**File:** `src/types/index.ts`

Define:
```ts
// Raw shape from prices.json
interface TokenPrice {
  currency: string;
  date: string;
  price: number;
}

// Processed token used throughout the app
interface Token {
  symbol: string;
  price: number;
  icon: string; // `/images/${symbol}.svg`
}

// Zod schema for the swap form
// (define in src/lib/schema.ts, not here — export SwapFormValues type here)
interface SwapFormValues {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: string;
}

// Swap status machine
type SwapStatus = 'idle' | 'loading' | 'success' | 'error';
```

No `any` anywhere. `TokenPrice` must match the exact shape returned by the API.

---

## TASK 3 — Zod Schema

**File:** `src/lib/schema.ts`

```ts
import { z } from 'zod';

export const swapSchema = z.object({
  fromSymbol: z.string().min(1, 'Select a token to send'),
  toSymbol: z.string().min(1, 'Select a token to receive'),
  fromAmount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Amount must be a positive number',
    }),
}).refine((data) => data.fromSymbol !== data.toSymbol, {
  message: 'Tokens must be different',
  path: ['toSymbol'],
});

export type SwapFormValues = z.infer<typeof swapSchema>;
```

---

## TASK 4 — usePrices Hook

**File:** `src/hooks/usePrices.ts`

Use `@tanstack/react-query` to fetch and process token prices.

Logic:
1. Fetch `https://interview.switcheo.com/prices.json`
2. Deduplicate: group by `currency`, keep the entry with the **latest `date`** string (ISO sort)
3. Filter out entries where `price` is 0, null, or undefined
4. Map to `Token[]`: `{ symbol: currency, price, icon: /images/${currency}.svg }`
5. Sort alphabetically by symbol

Return shape:
```ts
{
  tokens: Token[];
  isLoading: boolean;
  isError: boolean;
}
```

TanStack Query config:
- `queryKey: ['prices']`
- `staleTime: 60_000` (1 minute)
- `refetchOnWindowFocus: false`

---

## TASK 5 — useScramble Hook

**File:** `src/hooks/useScramble.ts`

Implements the scramble text animation described in UI_BRIEF Section 6.2.

```ts
// Props
interface UseScrambleProps {
  text: string;
  trigger: boolean;   // flip to true to start scramble
  speed?: number;     // ms per tick, default 30
  onComplete?: () => void;
}

// Returns
interface UseScrambleReturn {
  displayText: string;
}
```

Algorithm:
- Charset: `'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'`
- When `trigger` becomes `true`: start `setInterval` at `speed` ms
- Each tick: compute how many characters should be "resolved" based on elapsed ticks
  - Resolve index 0 first, then 1, then 2... (left to right)
  - Unresolved characters show a random char from charset
- When all characters resolved: clear interval, call `onComplete`
- If `text` changes while animating: restart from beginning

No external libraries. Pure `useEffect` + `useRef` + `useState`.

---

## TASK 6 — useAsciiReveal Hook

**File:** `src/hooks/useAsciiReveal.ts`

Reveals ASCII art character by character on mount.

```ts
interface UseAsciiRevealProps {
  art: string;        // full ASCII string including newlines
  speed?: number;     // ms per character, default 18
  onComplete?: () => void;
}

interface UseAsciiRevealReturn {
  displayed: string;
  isDone: boolean;
}
```

Algorithm:
- On mount: start interval at `speed` ms
- Each tick: append one character from `art` to `displayed`
- Preserve newlines — they are characters too, append them instantly (no delay for `\n`)
- When `displayed.length === art.length`: clear interval, set `isDone = true`, call `onComplete`

---

## TASK 7 — TokenSelector Component

**File:** `src/components/TokenSelector.tsx`

Props:
```ts
interface TokenSelectorProps {
  label: string;             // "YOU PAY" | "YOU RECEIVE"
  value: Token | null;
  tokens: Token[];
  onChange: (token: Token) => void;
  disabled?: boolean;
  error?: string;
}
```

Implementation:
- Use shadcn `Popover` + `Command` for the searchable dropdown
- Trigger button: shows selected token icon + scrambled symbol (use `useScramble`, trigger on each new selection)
- If no token selected: show `SELECT TOKEN` (font-mono, text-muted-fg, tracking-wider)
- Token list item: `[icon 20px] [symbol font-mono] [price in USD font-mono text-xs text-muted-fg]`
- Icon: `<img src={token.icon} />` with `onError` fallback to colored circle avatar
  - Avatar color: derived from `symbol.charCodeAt(0) % 6` → pick from 6 preset muted colors
  - Avatar letter: `symbol[0]` uppercase, font-mono text-xs centered
- Search: filters by symbol (case-insensitive)
- Selected item gets checkmark icon (lucide `Check`, 12px, text-primary)
- Error: red border on trigger + error text below (font-sans text-xs text-error)

Animations (Framer Motion):
- Dropdown open: `initial={{ opacity: 0, y: -4 }}` → `animate={{ opacity: 1, y: 0 }}`, duration 0.15s

---

## TASK 8 — AmountInput Component

**File:** `src/components/AmountInput.tsx`

Props:
```ts
interface AmountInputProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  error?: string;
  placeholder?: string;
}
```

Implementation:
- Wrapper div handles border + focus-within styling (not the input itself)
- Input: `type="text"` with `inputMode="decimal"` — allows decimals, prevents non-numeric input via `onChange` filter
- Filter: only allow characters matching `/^[0-9]*\.?[0-9]*$/`
- Read-only output: display value via `NumberFlow` component for animated number transitions
  - `import NumberFlow from 'number-flow'`
  - `<NumberFlow value={parseFloat(value) || 0} format={{ minimumFractionDigits: 2, maximumFractionDigits: 6 }} />`
- Label: top-left, font-sans text-xs tracking-wider text-muted-fg uppercase
- Error: below wrapper, font-sans text-xs text-error, animate in with framer motion height transition

---

## TASK 9 — SwapArrow Component

**File:** `src/components/SwapArrow.tsx`

Props:
```ts
interface SwapArrowProps {
  onClick: () => void;
  disabled?: boolean;
}
```

Implementation:
- 32x32px circle button, centered with negative margin overlap between FROM and TO sections
- Icon: lucide `ArrowUpDown`, 14px
- Framer Motion `animate={{ rotate }}` — track rotation state, add 180 on each click
- Hover: border-color → primary (CSS transition)

---

## TASK 10 — ExchangeRate Component

**File:** `src/components/ExchangeRate.tsx`

Props:
```ts
interface ExchangeRateProps {
  fromToken: Token | null;
  toToken: Token | null;
}
```

Implementation:
- Hidden (display none) when either token is null
- Format: `1 {FROM} = {rate} {TO}`
- `rate = (fromToken.price / toToken.price).toLocaleString('en-US', { maximumFractionDigits: 6 })`
- Apply `useScramble` to the rate number string — trigger on any token change
- Font: font-mono text-xs text-muted-fg
- Framer Motion: `AnimatePresence` + fade-in when tokens are both selected

---

## TASK 11 — SwapForm Component (Main)

**File:** `src/components/SwapForm.tsx`

This is the root form component. Composes all sub-components.

State managed by `react-hook-form` + zod resolver:
```ts
const form = useForm<SwapFormValues>({
  resolver: zodResolver(swapSchema),
  defaultValues: { fromSymbol: '', toSymbol: '', fromAmount: '' },
});
```

Derived state (not in form, use `useState` + `useMemo`):
```ts
const fromToken = useMemo(() => tokens.find(t => t.symbol === fromSymbol) ?? null, [tokens, fromSymbol]);
const toToken   = useMemo(() => tokens.find(t => t.symbol === toSymbol) ?? null, [tokens, toSymbol]);
const toAmount  = useMemo(() => {
  // Memoized: recomputes only when fromToken, toToken, or fromAmount changes
  if (!fromToken || !toToken || !fromAmount) return '';
  const input = parseFloat(fromAmount);
  if (isNaN(input) || input <= 0) return '';
  return (input * fromToken.price / toToken.price).toFixed(6);
}, [fromToken, toToken, fromAmount]);
```

Swap direction handler:
```ts
const handleFlip = () => {
  const prev = { from: fromSymbol, to: toSymbol };
  setValue('fromSymbol', prev.to);
  setValue('toSymbol', prev.from);
  setValue('fromAmount', toAmount); // carry over output as new input
};
```

Submit handler (mock):
```ts
const onSubmit = async () => {
  setStatus('loading');
  await new Promise(resolve => setTimeout(resolve, 1800));
  const success = Math.random() > 0.15; // 85% success rate for realism
  if (success) {
    setStatus('success');
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#f63d19', '#ffffff', '#131410'] });
    toast.success('Swap confirmed', { description: `${fromAmount} ${fromSymbol} → ${toAmount} ${toSymbol}` });
  } else {
    setStatus('error');
    toast.error('Swap failed', { description: 'Network error. Please try again.' });
  }
  setTimeout(() => setStatus('idle'), 3000);
};
```

Layout structure:
```
[ASCII Logo]
[Card]
  [Section: YOU PAY]
    [TokenSelector from] [AmountInput from]
  [SwapArrow]
  [Section: YOU RECEIVE]
    [TokenSelector to]   [AmountInput to readOnly]
  [ExchangeRate]
  [SubmitButton]
```

Framer Motion entrance (trigger after ASCII art isDone):
- Card: `initial={{ opacity: 0, y: 16 }}` → `animate={{ opacity: 1, y: 0 }}`, duration 0.4s
- Each section inside card: stagger with `delayChildren: 0.1`, `staggerChildren: 0.06`

---

## TASK 12 — AsciiLogo Component

**File:** `src/components/AsciiLogo.tsx`

ASCII art content:
```
 ___  ___  ____  ____  ____ 
/ __)/ __)/ ___)(  _ \(  __)
\__ \\__ \\__ \ ) __/ ) _) 
(___/(___/(____/(__)  (____)
     CURRENCY SWAP  v1.0
```

Implementation:
- Use `useAsciiReveal` hook — reveal on mount at 18ms/char
- After `isDone`: every 4 seconds, re-trigger `useScramble` on the `CURRENCY SWAP  v1.0` line only (not the full art)
- `<pre className="font-mono text-xs leading-tight text-primary select-none" aria-hidden="true">`
- Below the art: when `isDone`, fade in subtitle: `"DECENTRALIZED · INSTANT · TRUSTLESS"` (font-mono text-[10px] tracking-[0.25em] text-muted-fg)
- The fade-in of the subtitle triggers the card entrance animation (pass `onComplete` callback up to `App`)

---

## TASK 13 — SubmitButton Component

**File:** `src/components/SubmitButton.tsx`

Props:
```ts
interface SubmitButtonProps {
  status: SwapStatus;
  disabled: boolean;
}
```

States:
| Status | Background | Text | Icon |
|--------|-----------|------|------|
| `idle` | `primary` | `SWAP` | ArrowRightLeft (lucide) |
| `loading` | `primary` opacity-80 | `SWAPPING...` | Loader2 animate-spin |
| `success` | `success` | `SWAP SUCCESSFUL` | Check |
| `error` | `error` | `FAILED — RETRY` | X |

- Full width, height 44px, font-sans font-semibold tracking-wider
- Framer Motion `layout` prop for smooth text transitions between states
- Disabled: `opacity-50 cursor-not-allowed pointer-events-none`

---

## TASK 14 — ThemeToggle Component

**File:** `src/components/ThemeToggle.tsx`

- `useTheme()` from `next-themes`
- Fixed `top-4 right-4`
- 36x36px, surface bg, muted border, rounded-lg
- Sun icon (light mode) / Moon icon (dark mode), 16px
- Framer Motion `whileTap={{ scale: 0.9 }}`
- Tooltip (shadcn or title attr): "Toggle theme"

---

## TASK 15 — App Shell

**File:** `src/App.tsx`

```tsx
export default function App() {
  const [cardReady, setCardReady] = useState(false); // triggers after ASCII reveal

  return (
    <main className="min-h-screen bg-bg bg-grid flex flex-col items-center justify-center px-4 py-12">
      <ThemeToggle />
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <AsciiLogo onComplete={() => setCardReady(true)} />
        <AnimatePresence>
          {cardReady && <SwapForm />}
        </AnimatePresence>
      </div>
    </main>
  );
}
```

---

## TASK 16 — Loading + Error States

### While prices.json is loading:
- Render `SwapFormSkeleton` instead of `SwapForm`
- Two skeleton rows (shadcn `Skeleton`): one for token selector, one for amount input
- Match the exact dimensions of the real form — no layout shift on load

### If prices.json fetch fails:
- Render error card inside the swap card area:
  - Icon: AlertCircle (lucide), text-error
  - Text: `"Failed to load token prices"` font-sans
  - Retry button: calls `refetch()` from TanStack Query
  - font-mono text-xs text-muted-fg: `"Source: interview.switcheo.com"`

---

## TASK 17 — Final Polish

1. **tsconfig.json**: ensure `strict: true`, `noImplicitAny: true`
2. **Verify no `any` types** — run `npx tsc --noEmit`
3. **Mobile**: test at 320px — token selector popover must not overflow, inputs must be tappable (min 44px touch target)
4. **Icon 404 fallback**: confirm `onError` fallback avatar renders for any symbol not in `/public/images/`
5. **Accessibility**: 
   - All interactive elements have `focus-visible` ring in primary color
   - `aria-label` on icon-only buttons (ThemeToggle, SwapArrow)
   - `aria-live="polite"` on exchange rate display
   - `aria-describedby` linking error messages to inputs
6. **README.md**: document `npm install`, `npm run dev`, note about placing SVGs in `public/images/`
7. **Verify acceptance criteria** from OVERVIEW.md Section 9 — all 8 points must pass

---

## Completion Checklist

- [o] TASK 1: Project scaffold compiles
- [o] TASK 2: Types defined, no `any`
- [o] TASK 3: Zod schema with cross-field validation
- [o] TASK 4: usePrices — fetch, deduplicate, filter, sort
- [o] TASK 5: useScramble — scramble animation hook
- [o] TASK 6: useAsciiReveal — character reveal hook
- [o] TASK 7: TokenSelector — searchable, icon fallback, scramble on select
- [o] TASK 8: AmountInput — numeric filter, NumberFlow output, error state
- [o] TASK 9: SwapArrow — rotation animation
- [o] TASK 10: ExchangeRate — scramble on change, AnimatePresence
- [o] TASK 11: SwapForm — form state, flip logic, mock submit, confetti
- [o] TASK 12: AsciiLogo — reveal + scramble idle loop
- [o] TASK 13: SubmitButton — 4 status states, layout animation
- [o] TASK 14: ThemeToggle — next-themes, fixed position
- [o] TASK 15: App shell — cardReady gate, bg-grid
- [o] TASK 16: Loading skeleton + error state with retry
- [o] TASK 17: Polish — tsc clean, a11y, mobile, README

## Requirements

- **Language:** All code, comments, and UI copy are English (US / California conventions); no non-English source text.
- **Code quality:** Keep the codebase clean, organized, and easy to read—consistent with how experienced (senior) engineers structure and write production code.
- **Structure:** Always keep the structure, folder, files in the right place. separate the functions, hook, interface, types effectively and following the past practice of react project.
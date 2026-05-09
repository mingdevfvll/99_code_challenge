# UI BRIEF — Problem 2: Fancy Form (Currency Swap)

> Visual design specification for AI Agents implementing the frontend.
> Read OVERVIEW.md first for project context and code rules.
> This file governs: color tokens, typography, layout, component appearance, animation behavior.

---

## 1. Design Direction

**Style:** Monospace-technical minimal — inspired by Linear.app, Vercel dashboard, and retro terminal UIs.  
**Mood:** Precise, fast, trustworthy. Every pixel is intentional. No decoration without purpose.  
**Differentiator:** ASCII Art animation on load + scramble text effects on key interactions. The app feels alive without being noisy.

---

## 2. Color Tokens

Define all colors as CSS variables in `src/index.css`. Never use raw hex in component files.

```css
/* src/index.css */
:root {
  --color-primary:     #f63d19;   /* brand — buttons, focus rings, accents */
  --color-bg:          #ffffff;   /* page background */
  --color-fg:          #131410;   /* primary text */
  --color-muted:       #d9e3e7;   /* borders, dividers, placeholder text bg */
  --color-muted-fg:    #7a9199;   /* secondary text, labels */
  --color-surface:     #f5f7f8;   /* card background, input background */
  --color-surface-2:   #eaf0f2;   /* hover states on surface */
  --color-success:     #22c55e;
  --color-error:       #ef4444;
}

.dark {
  --color-primary:     #f63d19;   /* unchanged in dark */
  --color-bg:          #0f1110;
  --color-fg:          #f0f4f5;
  --color-muted:       #1e2a2e;
  --color-muted-fg:    #5a7880;
  --color-surface:     #161c1a;
  --color-surface-2:   #1e2826;
  --color-success:     #22c55e;
  --color-error:       #ef4444;
}
```

Map to Tailwind in `tailwind.config.ts`:
```ts
colors: {
  primary:   'var(--color-primary)',
  bg:        'var(--color-bg)',
  fg:        'var(--color-fg)',
  muted:     'var(--color-muted)',
  'muted-fg':'var(--color-muted-fg)',
  surface:   'var(--color-surface)',
  'surface-2':'var(--color-surface-2)',
  success:   'var(--color-success)',
  error:     'var(--color-error)',
}
```

---

## 3. Typography

### Font Loading
Add to `index.html` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Mukta+Vaani:wght@400;500;600;700&family=Pixelify+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### Usage Rules

| Token | Font | Weight | Use case |
|-------|------|--------|----------|
| `font-sans` | Mukta Vaani | 400/500 | Body text, descriptions, labels (80%) |
| `font-sans font-semibold` | Mukta Vaani | 600/700 | Section headings, button text |
| `font-mono` | Pixelify Sans | 400/500 | Numbers, token symbols, exchange rate, logo, ASCII art |

Configure in `tailwind.config.ts`:
```ts
fontFamily: {
  sans:  ['"Mukta Vaani"', 'sans-serif'],
  mono:  ['"Pixelify Sans"', 'monospace'],
}
```

**Rule:** Any element displaying a number, token symbol, or code-like value uses `font-mono`. All prose uses `font-sans`.

---

## 4. Layout

### Page Shell
```
- Full viewport height, flex column, items centered
- Background: bg-bg
- Subtle dot-grid or fine crosshatch pattern in bg (CSS only, low opacity ~0.04)
- Dark mode: same pattern, slightly brighter dots
```

CSS dot grid pattern:
```css
.bg-grid {
  background-image: radial-gradient(circle, var(--color-muted) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

### Swap Card
```
max-width:    448px  (max-w-md + slight override)
padding:      24px
border-radius: 12px  (rounded-xl)
border:       1px solid var(--color-muted)
background:   var(--color-surface)
box-shadow:   0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
```

No heavy drop shadows. Card should feel like it's part of the page, not floating above it.

---

## 5. Component Specs

### TokenSelector
```
Trigger button:
  - border: 1px solid var(--color-muted)
  - background: var(--color-bg)
  - height: 40px
  - padding: 8px 12px
  - font: font-mono text-sm
  - hover: background → var(--color-surface-2)
  - focus-visible: outline 2px solid var(--color-primary)

Token icon:
  - size: 20x20px
  - border-radius: 50%
  - fallback: circle with bg derived from symbol charCode, first letter centered, font-mono text-xs

Dropdown (shadcn Popover + Command):
  - background: var(--color-surface)
  - border: 1px solid var(--color-muted)
  - border-radius: 8px
  - search input: font-sans
  - item: icon + symbol (font-mono) + price in USD (font-mono text-xs text-muted-fg)
  - selected item: text-primary, checkmark icon on right
```

### AmountInput
```
Input field:
  - height: 48px
  - font: font-mono text-xl font-medium
  - background: transparent
  - border: none (border on wrapper)
  - text-align: right
  - placeholder: "0.00"  color: var(--color-muted-fg)

Wrapper:
  - border: 1px solid var(--color-muted)
  - border-radius: 8px
  - background: var(--color-bg)
  - focus-within: border-color → var(--color-primary)
  - transition: border-color 150ms ease

Error state:
  - border-color: var(--color-error)
  - error message below: text-xs text-error font-sans mt-1

Read-only (output amount):
  - background: var(--color-surface)
  - cursor: default
  - text color: var(--color-muted-fg) when 0, var(--color-fg) when has value
```

### SwapArrow Button
```
- Size: 32x32px circle
- Background: var(--color-surface)
- Border: 1px solid var(--color-muted)
- Icon: ArrowUpDown from lucide-react, size 14px
- Position: centered between FROM and TO sections, slight negative margin overlap
- Hover: background → var(--color-surface-2), border-color → var(--color-primary)
- Click animation: rotate 180deg, duration 300ms, ease-in-out
```

### ExchangeRate display
```
- Font: font-mono text-xs
- Color: var(--color-muted-fg)
- Format: "1 ETH = 1,645.90 USDC"
- Positioned between swap arrow and submit button
- Hidden when either token is not selected
- Subtle fade-in (opacity 0 → 1, duration 200ms) when rate appears
```

### Submit Button
```
- Full width
- Height: 44px
- Background: var(--color-primary)
- Text: font-sans font-semibold text-white
- Border-radius: 8px
- Hover: brightness(0.9) on primary
- Disabled: opacity-50, cursor-not-allowed
- Loading state: spinner (Loader2 from lucide, animate-spin) + "Swapping..." text
- Success state: background → var(--color-success), text → "Swap Successful ✓"
- Error state: background → var(--color-error), text → "Failed — Try Again"
- Transition: background-color 200ms ease
```

### ThemeToggle
```
- Position: fixed top-4 right-4
- Size: 36x36px
- Background: var(--color-surface)
- Border: 1px solid var(--color-muted)
- Border-radius: 8px
- Icon: Sun (light mode) / Moon (dark mode) from lucide-react, size 16px
- Hover: border-color → var(--color-primary)
```

---

## 6. Animation Specs

### 6.1 ASCII Art — App Logo / Header

Render a small ASCII art block above the swap card using `font-mono`.  
The art animates on **page load**: characters are revealed line by line, left to right, with a typing cursor effect.

```
Suggested ASCII (can be customized):
 ___  _    _  ___  ____
/ __|| |  | |/ _ \|  _ \
\__ \| |/\| || (_) | |_) |
|___/|__/\__|'\___/|____/
```

Implementation rules:
- Render as `<pre>` with `font-mono text-xs leading-tight text-primary`
- On mount: start with empty string, reveal one character every `18ms`
- After full reveal: hold for 800ms, then transition to scramble idle state (see 6.2)
- Do not use a library — implement with `useEffect` + `setInterval`

### 6.2 Scramble Text Effect

Apply to: **token symbols** in the selector trigger, **exchange rate numbers**, and **ASCII art logo** (idle loop).

Behavior:
- On trigger (token selected, rate updated, or idle loop every 4s on logo):
  - For `N` frames (N = text.length * 2), replace each character with a random character from the charset
  - Each character resolves to its final value progressively (left to right)
  - Total duration: ~400ms
- Charset: `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&`

Implementation:
```ts
// src/hooks/useScramble.ts
// Props: { text: string, trigger: boolean, speed?: number }
// Returns: { displayText: string }
// Algorithm:
//   - When trigger flips true: start interval
//   - Each tick: for each index i, if resolved[i] = true keep text[i], else random char
//   - Resolve index 0 first at tick N/length, then index 1, etc.
//   - Clear interval when all resolved
```

Apply to token symbol in `TokenSelector` trigger and in `ExchangeRate` display.

### 6.3 Form Section Entrance

On page load, after ASCII art finishes:
- Swap card fades in + slides up: `opacity 0→1, translateY 12px→0, duration 400ms, ease-out`
- Stagger internal sections: FROM block → arrow → TO block → rate → button
  - Each section: `animation-delay` increments of `60ms`
- Use CSS `@keyframes` or Tailwind `animate-` utilities

### 6.4 Swap Arrow Rotation
```css
/* On click: */
transform: rotate(180deg);
transition: transform 300ms ease-in-out;
/* Toggle direction each click */
```

### 6.5 Input Focus Pulse
When AmountInput receives focus:
- Border color transitions to `var(--color-primary)` over `150ms`
- No glow, no box-shadow — keep it minimal

---

## 7. Dark Mode

- Toggle via `next-themes` — class-based (`class="dark"` on `<html>`)
- Every color token must have a `.dark` override in `index.css` (see Section 2)
- ThemeToggle reads `useTheme()` from `next-themes`
- Dot grid pattern opacity: `0.04` light / `0.06` dark
- ASCII art color: `text-primary` both modes (orange-red unchanged)
- Transitions on theme switch: `transition-colors duration-200` on `<body>`

---

## 8. Responsive

| Breakpoint | Behavior |
|-----------|----------|
| < 480px | Card is full width, padding reduced to 16px, font sizes scale down slightly |
| 480px–768px | Card centered, max-w-md |
| > 768px | Card centered, page has more breathing room |

No horizontal scroll at any breakpoint.  
Token selector dropdown must not overflow viewport on mobile.

---

## 9. Micro-copy

| Element | Text |
|---------|------|
| FROM label | `YOU PAY` |
| TO label | `YOU RECEIVE` |
| Submit idle | `SWAP` |
| Submit loading | `SWAPPING...` |
| Submit success | `SWAP SUCCESSFUL` |
| Submit error | `FAILED — RETRY` |
| Rate format | `1 {FROM} = {rate} {TO}` |
| Amount placeholder | `0.00` |
| No token selected | `SELECT TOKEN` |
| Search placeholder | `Search token...` |

All caps for button text and labels — matches the monospace technical aesthetic.  
Use `tracking-wider` Tailwind class on ALL CAPS text.

---

## 10. Accessibility

- All interactive elements must have `focus-visible` outlines using `var(--color-primary)`
- Token selector dropdown must be keyboard navigable (shadcn Command handles this)
- Error messages must be linked to inputs via `aria-describedby`
- Submit button disabled state must have `aria-disabled="true"`
- Color contrast ratio: minimum 4.5:1 for all text against backgrounds
- Dark mode must also meet contrast requirements
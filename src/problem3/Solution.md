# Problem 3: Messy React — Code Review

This document identifies all computational inefficiencies and anti-patterns found in the original `WalletPage` component, grouped by severity.

---

## 🔴 Runtime Bugs

### 1. Undefined variable `lhsPriority`

**Location:** `sortedBalances` filter callback

```ts
// Original
const balancePriority = getPriority(balance.blockchain);
if (lhsPriority > -99) { // ❌ lhsPriority is never declared
```

`balancePriority` is declared but never used. The condition references `lhsPriority` which does not exist in scope — this throws a `ReferenceError` at runtime and breaks the entire component.

**Fix:** Replace `lhsPriority` with `balancePriority`.

---

### 2. `rows` iterates `sortedBalances` instead of `formattedBalances`

**Location:** `rows` mapping

```ts
// Original
const formattedBalances = sortedBalances.map((balance: WalletBalance) => {
  return { ...balance, formatted: balance.amount.toFixed() }
})

const rows = sortedBalances.map((balance: FormattedWalletBalance, index: number) => {
  // ❌ sortedBalances items don't have `formatted` field
  formattedAmount={balance.formatted} // → always undefined
})
```

`formattedBalances` is computed but never consumed. `sortedBalances` does not carry the `formatted` field, so `balance.formatted` is always `undefined`.

**Fix:** Replace `sortedBalances.map` with `formattedBalances.map` in the `rows` declaration.

---

## 🟠 Logic Errors

### 3. Filter logic is inverted

**Location:** `sortedBalances` filter callback

```ts
// Original
if (lhsPriority > -99) {
  if (balance.amount <= 0) { // ❌ keeps balances with zero or negative amount
    return true;
  }
}
return false;
```

The intent is to display balances that have a valid priority AND a positive amount. The current logic does the opposite — it only keeps balances where `amount <= 0`.

**Fix:**
```ts
if (balancePriority > -99 && balance.amount > 0) {
  return true;
}
return false;
```

---

### 4. `blockchain` field missing from `WalletBalance` interface

**Location:** Interface definition

```ts
// Original
interface WalletBalance {
  currency: string;
  amount: number;
  // ❌ `blockchain` is missing
}
```

`balance.blockchain` is accessed in both the filter and sort logic, but it is not declared in the `WalletBalance` interface. TypeScript does not catch this because `getPriority` accepts `any`.

**Fix:**
```ts
interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: string;
}
```

---

### 5. Sort comparator does not handle equal priorities

**Location:** `.sort()` callback

```ts
// Original
if (leftPriority > rightPriority) {
  return -1;
} else if (rightPriority > leftPriority) {
  return 1;
}
// ❌ returns `undefined` when equal — should return 0
```

A comparator function must always return a number. Returning `undefined` when priorities are equal leads to inconsistent, engine-dependent sort behavior.

**Fix:** Add `return 0;` as the final case.

---

## 🟡 Performance Issues

### 6. `getPriority` defined inside the component

```ts
// Original
const WalletPage: React.FC<Props> = (props: Props) => {
  const getPriority = (blockchain: any): number => { // ❌ recreated on every render
    switch (blockchain) { ... }
  }
```

`getPriority` is a pure function with no dependency on props or state. Defining it inside the component causes it to be recreated on every render cycle, adding unnecessary overhead.

**Fix:** Move it outside the component entirely.

```ts
const getPriority = (blockchain: string): number => {
  switch (blockchain) { ... }
}

const WalletPage: React.FC<Props> = (props: Props) => { ... }
```

---

### 7. `prices` is an unnecessary dependency in `useMemo`

```ts
// Original
const sortedBalances = useMemo(() => {
  return balances.filter(...).sort(...)
}, [balances, prices]); // ❌ prices is not used inside this memo
```

`prices` is only used when computing `usdValue` in the `rows` map — not inside `sortedBalances`. Including it means the sort re-runs every time prices update, which is wasteful.

**Fix:** Remove `prices` from the dependency array.

```ts
}, [balances]);
```

---

### 8. `formattedBalances` is not memoized

```ts
// Original
const formattedBalances = sortedBalances.map((balance: WalletBalance) => {
  return { ...balance, formatted: balance.amount.toFixed() }
})
```

`formattedBalances` is derived from `sortedBalances` (which is memoized) but is itself recomputed on every render. It should also be wrapped in `useMemo`.

**Fix:**
```ts
const formattedBalances = useMemo(() => {
  return sortedBalances.map((balance: WalletBalance) => ({
    ...balance,
    formatted: balance.amount.toFixed()
  }));
}, [sortedBalances]);
```

---

## 🔵 Anti-patterns

### 9. `blockchain` typed as `any`

```ts
// Original
const getPriority = (blockchain: any): number => { ... } // ❌ defeats TypeScript
```

Using `any` removes all type safety. The function only handles a known set of blockchain names — this should be an explicit union type.

**Fix:**
```ts
type Blockchain = 'Osmosis' | 'Ethereum' | 'Arbitrum' | 'Zilliqa' | 'Neo';

const getPriority = (blockchain: Blockchain | string): number => { ... }
```

---

### 10. Using array `index` as `key`

```tsx
// Original
key={index} // ❌ unstable key on a filtered and sorted list
```

This list is both filtered and sorted, meaning items change position across renders. Using `index` as key causes React to reuse the wrong DOM nodes, leading to incorrect rendering and missed reconciliation.

**Fix:** Use a stable, unique identifier.

```tsx
key={balance.currency}
```

---

### 11. `children` is destructured but never rendered

```ts
// Original
const { children, ...rest } = props; // `children` is discarded
```

`children` is pulled out of `props` but never used in the JSX output. This is either dead code or an accidental omission. Either remove the destructuring or render `{children}` if it is intentional.

---

## Summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | `lhsPriority` is undefined — ReferenceError | 🔴 Runtime crash |
| 2 | `rows` uses `sortedBalances` instead of `formattedBalances` | 🔴 Wrong data rendered |
| 3 | Filter logic is inverted | 🟠 Logic error |
| 4 | `blockchain` missing from `WalletBalance` interface | 🟠 Type unsafe |
| 5 | Sort comparator missing `return 0` | 🟠 Unstable sort |
| 6 | `getPriority` defined inside component | 🟡 Unnecessary re-creation |
| 7 | `prices` in `useMemo` deps is unused | 🟡 Unnecessary re-computation |
| 8 | `formattedBalances` not memoized | 🟡 Unnecessary re-computation |
| 9 | `blockchain: any` | 🔵 Anti-pattern |
| 10 | `key={index}` on dynamic list | 🔵 Anti-pattern |
| 11 | `children` destructured but never used | 🔵 Dead code |

---

## Problem 3 materials & folder layout

Use the following when working through Problem 3:

1. **Start with this file ([Solution.md](./Solution.md)).** It lists every bug, logic issue, performance concern, and anti-pattern in the original snippet, with severity and suggested fixes. Read it end-to-end before or while comparing against the annotated and fixed code.

2. **[`WalletPage/note_code.tsx`](./WalletPage/note_code.tsx)** — The messy exercise code with **inline English comments** tied to each issue (same numbering as above). Use it as your **review notes**: what is wrong and what to change, without replacing the buggy behavior in that file.

3. **[`WalletPage/fixed_solution.tsx`](./WalletPage/fixed_solution.tsx)** — The **submitted / reference solution**: corrected implementation that applies the fixes described in [Solution.md](./Solution.md).

4. **[`wallet-app/`](./wallet-app/)** — A **self-contained Next.js 16** demo package that reproduces the wallet UI as a runnable app. Logic and UI are **split across modules** (for example mock data in [`data/`](./wallet-app/data/), helpers in [`lib/`](./wallet-app/lib/), presentational pieces under [`components/`](./wallet-app/components/), types in [`types/`](./wallet-app/types/)). Open [`wallet-app/package.json`](./wallet-app/package.json) and run the dev script from that folder if you want to explore the full demo locally.

### Quick reference (paths & roles)

| Path | Role |
|------|------|
| [Solution.md](./Solution.md) | Full code-review write-up: bugs, logic issues, performance notes, anti-patterns, fixes, and summary table. |
| [WalletPage/note_code.tsx](./WalletPage/note_code.tsx) | Original messy snippet kept intentionally buggy; inline comments map each issue to the numbered findings above (study / grading notes). |
| [WalletPage/fixed_solution.tsx](./WalletPage/fixed_solution.tsx) | Reference implementation applying the fixes from [Solution.md](./Solution.md). |
| [wallet-app/](./wallet-app/) | Runnable Next.js 16 demo app root (routing under `app/`, config, styles). |
| [wallet-app/package.json](./wallet-app/package.json) | Dependencies and npm scripts (e.g. `dev`) to run the demo locally. |
| [wallet-app/data/](./wallet-app/data/) | Mock wallet / price data used by the demo. |
| [wallet-app/lib/](./wallet-app/lib/) | Shared helpers (e.g. priority rules, formatting). |
| [wallet-app/components/](./wallet-app/components/) | UI building blocks for the wallet screen. |
| [wallet-app/types/](./wallet-app/types/) | Shared TypeScript types for wallet-related data. |

**Suggested order:** Read [Solution.md](./Solution.md) → skim [note_code.tsx](./WalletPage/note_code.tsx) for annotated pitfalls → compare with [fixed_solution.tsx](./WalletPage/fixed_solution.tsx) → optionally run [wallet-app](./wallet-app/) to see a modular, production-style layout.
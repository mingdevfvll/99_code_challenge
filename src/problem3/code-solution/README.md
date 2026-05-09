# Problem 3 — Code artifacts

Short guide to the files in this folder and related docs.

## `note_code.tsx`

The original messy component with **inline comments**: each block flags an issue (what is wrong, why it matters, what to change). Use this when you want a **line-by-line** walkthrough tied to the starting code.

## `fixed_solution.tsx`

A **standalone refactored** `WalletPage`-style component: corrected types, helpers hoisted out of the render path, memoization where appropriate, and aligned with the exercise brief. Read this for the **clean answer**, not the annotated draft.

## `wallet-app/` (sibling folder)

A small **Next.js demo** that applies the same ideas in a real app layout (components, hooks, styling). Use it to see structure and UX; it is not the minimal exam submission.

## `Solution.md` (parent folder)

A **structured write-up** of every inefficiency and anti-pattern, with severity, fixes, and rationale—organized as the full narrative for the problem.

**Suggested order:** skim `note_code.tsx` for mapping issues to the original snippet → read `Solution.md` for the systematic analysis → read `fixed_solution.tsx` for the compact code answer → optional: explore `wallet-app/` for the demo app.

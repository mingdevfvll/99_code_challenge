# Problem 1: Three Ways to Sum to N

A classic algorithm problem solved three different ways in JavaScript, each demonstrating a distinct approach with different performance characteristics.

## Problem Statement

Given an integer `n`, return the summation of all integers from `1` to `n`.

```
sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15
```

---

## Implementation

### Approach A — Iterative Loop `O(n)`

The most intuitive approach. Iterates from `1` to `n`, accumulating the sum.

```js
var sum_to_n_a = function(n) {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
        sum += i;
    }
    return sum;
};
```

**Pros:** Readable, easy to reason about.  
**Cons:** O(n) time — blocks the thread for large `n`. On JS's single-threaded runtime, a very large `n` (e.g. 10 billion) will freeze the event loop.

### Approach B — Closed-form formula `O(1)`

Uses Gauss's formula `n(n + 1) / 2` for the sum `1 + … + n`.

```js
var sum_to_n_b = function(n) {
  return (n * (n + 1)) / 2;
};
```

**Pros:** O(1) time and space; one arithmetic step regardless of `n`; does not block the event loop or risk stack overflow; compact.  
**Cons:** The intermediate product `n * (n + 1)` can overflow for very large `n` (many problems still bound inputs below `Number.MAX_SAFE_INTEGER`). The formula is easy to forget under interview pressure.

### Approach C — Recursion `O(n)` time, `O(n)` stack space

Defines the sum inductively: `sum(n) = n + sum(n - 1)`, with a base case for `n <= 0`.

```js
var sum_to_n_c = function(n) {
  if (n <= 0) return 0;
  return n + sum_to_n_c(n - 1);
};
```

**Pros:** Short and mirrors the mathematical definition; easy to justify correctness by induction.  
**Cons:** `O(n)` call-stack depth — typical JavaScript stacks support roughly on the order of 10k–15k frames, so very large `n` can overflow the stack. This shape does not get practical tail-call optimization in mainstream JS engines, so each level pays call overhead and it is slower than an equivalent loop.

---

## Project Structure

```
src/problem1/
├── README.md
├── sum_to_n_a.js             # Approach A implementation
├── sum_to_n_b.js             # Approach B implementation
├── sum_to_n_c.js             # Approach C implementation
└── tests/
    ├── sum_to_n_a.test.js    # Test cases for Approach A
    ├── sum_to_n_b.test.js    # Test cases for Approach B
    └── sum_to_n_c.test.js    # Test cases for Approach C
```

---

## How to Run Tests

No external dependencies required. Each test script runs cases and prints pass/fail.

```bash
node src/problem1/tests/sum_to_n_a.test.js
node src/problem1/tests/sum_to_n_b.test.js
node src/problem1/tests/sum_to_n_c.test.js
```

Expected output (each script): a short report ending with `PASSED` when all cases succeed.

---

## Test Cases Covered

| Input | Expected Output |
|-------|----------------|
| `5`   | `15`            |
| `1`   | `1`             |
| `0`   | `0`             |
| `100` | `5050`          |
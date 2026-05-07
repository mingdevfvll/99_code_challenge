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

---

## Project Structure

```
src/problem1/
├── README.md
├── sum_to_n_fn1.js             # Approach A implementation
└── tests/
    └── sum_to_n_fn1.test.js    # Test cases for Approach A
```

---

## How to Run Tests

No external dependencies required. Uses Node.js built-in `console.assert`.

```bash
node src/problem1/tests/sum_to_n_fn1.test.js
```

Expected output:

```
All tests passed
```

---

## Test Cases Covered

| Input | Expected Output |
|-------|----------------|
| `5`   | `15`            |
| `1`   | `1`             |
| `0`   | `0`             |
| `100` | `5050`          |
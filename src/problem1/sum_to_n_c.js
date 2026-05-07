// sum_to_n_c.js  

/**
 * Approach C: Recursion — O(n) time, O(n) stack space.
 *
 * Pros:
 * - Short code; mirrors the math directly: sum(n) = n + sum(n - 1).
 * - Easy to argue correctness from the inductive definition.
 *
 * Cons:
 * - O(n) call-stack depth; typical JS stacks are on the order of 10k–15k
 *   frames, so very large n risks stack overflow.
 * - No practical tail-call optimization here — each frame must combine n with
 *   the result from the recursive call.
 * - Slower than a loop due to per-call overhead.
 */
var sum_to_n_c = function(n) {
  if (n <= 0) return 0;
  return n + sum_to_n_c(n - 1);
};

module.exports = { sum_to_n_c };
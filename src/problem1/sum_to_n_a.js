// sum_to_n_a.js

/**
 * Approach A: Iterative loop - O(n) time, O(1) space
 * 
 * Pros: Readable, easy to reason about.  
 * Cons: O(n) time — blocks the thread for large `n`. 
 *        On JS's single-threaded runtime, a very large `n` (e.g. 10 billion) will freeze the event loop.
 */
var sum_to_n_a = function(n) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
      sum += i;
  }
  return sum;
};

module.exports = { sum_to_n_a };
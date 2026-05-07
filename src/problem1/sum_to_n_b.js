// sum_to_n_b.js  

/**
 * Approach B: Closed-form formula — O(1) time, O(1) space.
 *
 * Pros:
 * - O(1) time and space: one arithmetic step regardless of n.
 * - Does not block the event loop; no stack overflow risk.
 * - Compact and low bug surface.
 *
 * Cons:
 * - The intermediate product n * (n + 1) can overflow for very large n (the
 *   problem may still bound inputs below Number.MAX_SAFE_INTEGER).
 * - Gauss's formula is easy to forget under interview pressure — recalling it
 *   is a strong signal when you do.
 */
var sum_to_n_b = function(n) {
  return (n * (n + 1)) / 2;
};

module.exports = { sum_to_n_b };
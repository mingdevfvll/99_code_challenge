import { getPriority } from './get-priority';
import type { FormattedWalletBalance, WalletBalance } from '../types/wallet';

/**
 * Keeps balances on chains we recognize with priority above the default and a positive amount,
 * then sorts by chain priority descending (e.g. Osmosis before Neo).
 */
export function selectSortedVisibleBalances(balances: WalletBalance[]): WalletBalance[] {
  return [...balances]
    .filter((b) => getPriority(b.blockchain) > -99 && b.amount > 0)
    .sort((lhs, rhs) => {
      const l = getPriority(lhs.blockchain);
      const r = getPriority(rhs.blockchain);
      if (l > r) return -1;
      if (l < r) return 1;
      return 0;
    });
}

/** Adds a fixed-decimal string for displaying each raw amount. */
export function withFormattedAmounts(balances: WalletBalance[]): FormattedWalletBalance[] {
  return balances.map((b) => ({ ...b, formatted: b.amount.toFixed(4) }));
}

/**
 * Sums USD notionals using the provided price map; missing symbols count as 0.
 */
export function computeTotalUsdValue(
  balances: FormattedWalletBalance[],
  prices: Record<string, number>,
): number {
  return balances.reduce((sum, b) => sum + (prices[b.currency] ?? 0) * b.amount, 0);
}

/** Distinct blockchain networks represented in the list. */
export function countUniqueChains(balances: WalletBalance[]): number {
  return new Set(balances.map((b) => b.blockchain)).size;
}

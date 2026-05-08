'use client';

import { useMemo } from 'react';

import { MOCK_BALANCES } from '../data/mock-wallet';
import {
  computeTotalUsdValue,
  countUniqueChains,
  selectSortedVisibleBalances,
  withFormattedAmounts,
} from '../lib/wallet-portfolio';

/**
 * Derives visible balances, formatted rows, totals, and summary counts from mock data and live prices.
 * Data pipeline stays out of the page component.
 */
export function useWalletPortfolio(prices: Record<string, number>) {
  const sortedBalances = useMemo(
    () => selectSortedVisibleBalances(MOCK_BALANCES),
    [],
  );

  const formattedBalances = useMemo(
    () => withFormattedAmounts(sortedBalances),
    [sortedBalances],
  );

  const totalUsd = useMemo(
    () => computeTotalUsdValue(formattedBalances, prices),
    [formattedBalances, prices],
  );

  const uniqueChains = useMemo(
    () => countUniqueChains(formattedBalances),
    [formattedBalances],
  );

  const hiddenCount = MOCK_BALANCES.length - formattedBalances.length;

  return {
    formattedBalances,
    totalUsd,
    uniqueChains,
    hiddenCount,
  };
}

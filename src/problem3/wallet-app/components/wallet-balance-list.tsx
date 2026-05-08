'use client';

import { WalletRow } from './wallet-row';
import type { FormattedWalletBalance } from '../types/wallet';

interface WalletBalanceListProps {
  balances: FormattedWalletBalance[];
  prices: Record<string, number>;
}

export function WalletBalanceList({ balances, prices }: WalletBalanceListProps) {
  return (
    <div className="pt-2">
      <p className="text-xs text-gray-600 px-1 mb-3">
        Sorted by chain priority (highest first)
      </p>
      <div className="space-y-2">
        {balances.map((balance) => (
          <WalletRow
            key={balance.currency}
            balance={balance}
            usdValue={(prices[balance.currency] ?? 0) * balance.amount}
          />
        ))}
      </div>
    </div>
  );
}

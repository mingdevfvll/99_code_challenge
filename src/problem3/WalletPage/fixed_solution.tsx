import React, { useMemo } from 'react';
import { cn } from '@/lib/utils'; // shadcn utility for className merging

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------

type Blockchain = 'Osmosis' | 'Ethereum' | 'Arbitrum' | 'Zilliqa' | 'Neo';

interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: Blockchain | string; // Added missing field
}

interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
}

// Replaced BoxProps (MUI) with standard HTML div props
interface Props extends React.HTMLAttributes<HTMLDivElement> {}

// -----------------------------------------------------------------
// Helpers (defined outside component to avoid recreation on re-render)
// -----------------------------------------------------------------

/**
 * Returns a priority score for a given blockchain.
 * Higher value = higher priority in the display list.
 */
const getPriority = (blockchain: Blockchain | string): number => {
  switch (blockchain) {
    case 'Osmosis':   return 100;
    case 'Ethereum':  return 50;
    case 'Arbitrum':  return 30;
    case 'Zilliqa':   return 20;
    case 'Neo':       return 20;
    default:          return -99;
  }
};

// -----------------------------------------------------------------
// Component
// -----------------------------------------------------------------

const WalletPage: React.FC<Props> = ({ children, className, ...rest }: Props) => {

  const balances = useWalletBalances();
  const prices = usePrices();

  /**
   * Filter balances to only those with a valid blockchain priority
   * and a positive amount, then sort by priority descending.
   *
   * Dependencies: `balances` only — `prices` is not used here.
   */
  const sortedBalances = useMemo(() => {
    return balances
      .filter((balance: WalletBalance) => {
        const priority = getPriority(balance.blockchain);
        return priority > -99 && balance.amount > 0; // Fixed: was inverted + used undefined lhsPriority
      })
      .sort((lhs: WalletBalance, rhs: WalletBalance) => {
        const leftPriority  = getPriority(lhs.blockchain);
        const rightPriority = getPriority(rhs.blockchain);

        if (leftPriority > rightPriority) return -1;
        if (leftPriority < rightPriority) return 1;
        return 0; // Fixed: was returning undefined for equal priorities
      });
  }, [balances]); // Fixed: removed `prices` — it is not used in this memo

  /**
   * Attach a human-readable formatted amount to each balance.
   * Memoized since it is derived from `sortedBalances`.
   */
  const formattedBalances: FormattedWalletBalance[] = useMemo(() => {
    return sortedBalances.map((balance: WalletBalance) => ({
      ...balance,
      formatted: balance.amount.toFixed(2), // toFixed(2) for consistent decimal display
    }));
  }, [sortedBalances]);

  /**
   * Render one WalletRow per formatted balance.
   * Uses `balance.currency` as key — stable across re-renders.
   */
  const rows = formattedBalances.map((balance: FormattedWalletBalance) => { // Fixed: was iterating sortedBalances
    const usdValue = prices[balance.currency] * balance.amount;

    return (
      <WalletRow
        className={classes.row}
        key={balance.currency} // Fixed: was using index — unstable on filtered/sorted lists
        amount={balance.amount}
        usdValue={usdValue}
        formattedAmount={balance.formatted} // Fixed: now correctly defined
      />
    );
  });

  return (
    <div className={cn('flex flex-col gap-2', className)} {...rest}>
      {children} {/* Fixed: children was destructured but never rendered */}
      {rows}
    </div>
  );
};

export default WalletPage;

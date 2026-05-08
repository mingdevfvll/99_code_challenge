/*
 * Issue 4: `blockchain` is missing from `WalletBalance`.
 * Problem: `balance.blockchain` is used below but not declared on the interface; TypeScript cannot enforce correctness.
 * TODO: Add `blockchain: string` (or a union type) to `WalletBalance`.
 */
interface WalletBalance {
  currency: string;
  amount: number;
}
interface FormattedWalletBalance {
  currency: string;
  amount: number;
  formatted: string;
}

interface Props extends BoxProps {

}

/*
 * Issue 11: `children` is destructured but never rendered.
 * Problem: `children` is removed from props and discarded; layout/content may be unintentionally dropped.
 * TODO: Render `{children}` where appropriate, or remove `children` from destructuring if unused.
 */
const WalletPage: React.FC<Props> = (props: Props) => {
  const { children, ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();

  /*
   * Issue 6: `getPriority` is defined inside the component.
   * Problem: A new function instance is created on every render though it is pure and stateless.
   * TODO: Move `getPriority` outside the component (module scope).
   *
   * Issue 9: `blockchain` is typed as `any`.
   * Problem: Disables TypeScript checking for blockchain names.
   * TODO: Use a union type (e.g. `'Osmosis' | 'Ethereum' | ...`) or `string` with a narrow map.
   */
	const getPriority = (blockchain: any): number => {
	  switch (blockchain) {
	    case 'Osmosis':
	      return 100
	    case 'Ethereum':
	      return 50
	    case 'Arbitrum':
	      return 30
	    case 'Zilliqa':
	      return 20
	    case 'Neo':
	      return 20
	    default:
	      return -99
	  }
	}

  /*
   * Issue 7: `prices` is an unnecessary dependency of this `useMemo`.
   * Problem: `prices` is not used inside filter/sort; including it reruns the memo on every price change.
   * TODO: Use dependency array `[balances]` only.
   *
   * Issue 1: Undefined identifier `lhsPriority`.
   * Problem: ReferenceError at runtime — only `balancePriority` exists; `lhsPriority` is never declared.
   * TODO: Compare `balancePriority` (not `lhsPriority`) against `-99`.
   *
   * Issue 3: Filter logic is inverted.
   * Problem: Keeps rows where `amount <= 0` when priority is valid; positive balances are excluded.
   * TODO: Require `balancePriority > -99 && balance.amount > 0` for inclusion.
   *
   * Issue 5: Sort comparator omits equal priorities.
   * Problem: When priorities tie, the callback returns `undefined`; sort order becomes unspecified across engines.
   * TODO: End with `return 0` when `leftPriority === rightPriority`.
   */
  const sortedBalances = useMemo(() => {
    return balances.filter((balance: WalletBalance) => {
		  const balancePriority = getPriority(balance.blockchain);
		  if (lhsPriority > -99) {
		     if (balance.amount <= 0) {
		       return true;
		     }
		  }
		  return false
		}).sort((lhs: WalletBalance, rhs: WalletBalance) => {
			const leftPriority = getPriority(lhs.blockchain);
		  const rightPriority = getPriority(rhs.blockchain);
		  if (leftPriority > rightPriority) {
		    return -1;
		  } else if (rightPriority > leftPriority) {
		    return 1;
		  }
    });
  }, [balances, prices]);

  /*
   * Issue 8: `formattedBalances` is not memoized.
   * Problem: Recomputed on every render even when `sortedBalances` is unchanged.
   * TODO: Wrap in `useMemo(() => ..., [sortedBalances])`.
   */
  const formattedBalances = sortedBalances.map((balance: WalletBalance) => {
    return {
      ...balance,
      formatted: balance.amount.toFixed()
    }
  })

  /*
   * Issue 2: `rows` maps `sortedBalances` instead of `formattedBalances`.
   * Problem: Items from `sortedBalances` lack `formatted`; `balance.formatted` is always `undefined`.
   * TODO: Map over `formattedBalances` so `formattedAmount` receives the formatted string.
   *
   * Issue 10: `key={index}` on a filtered/sorted list.
   * Problem: Indices shift when filter/sort changes; React may reuse wrong rows / stale UI.
   * TODO: Use a stable key such as `balance.currency` (or id if available).
   */
  const rows = sortedBalances.map((balance: FormattedWalletBalance, index: number) => {
    const usdValue = prices[balance.currency] * balance.amount;
    return (
      <WalletRow 
        className={classes.row}
        key={index}
        amount={balance.amount}
        usdValue={usdValue}
        formattedAmount={balance.formatted}
      />
    )
  })

  return (
    <div {...rest}>
      {rows}
    </div>
  )
}

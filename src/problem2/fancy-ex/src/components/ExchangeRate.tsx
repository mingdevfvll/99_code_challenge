import { AnimatePresence, motion } from "framer-motion";

import type { Token } from "@/types";
import { formatExchangeRate } from "@/lib/numbers/currency-format";
import { useScramble } from "@/hooks/useScramble";

export interface ExchangeRateProps {
  fromToken: Token | null;
  toToken: Token | null;
}

interface ExchangeRateContentProps {
  fromToken: Token;
  toToken: Token;
}

function ExchangeRateContent({
  fromToken,
  toToken,
}: ExchangeRateContentProps) {
  const rate = formatExchangeRate(fromToken, toToken);
  const { displayText } = useScramble({
    text: rate,
    trigger: true,
  });

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="text-xs text-muted-fg"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`1 ${fromToken.symbol} = ${rate} ${toToken.symbol}`}
    >
      1 {fromToken.symbol} = {displayText || rate} {toToken.symbol}
    </motion.p>
  );
}

export function ExchangeRate({ fromToken, toToken }: ExchangeRateProps) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {fromToken && toToken ? (
        <ExchangeRateContent
          key={`${fromToken.symbol}-${toToken.symbol}`}
          fromToken={fromToken}
          toToken={toToken}
        />
      ) : null}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from "framer-motion";

import type { Token } from "@/types";
import { useScramble } from "@/hooks/useScramble";

export interface ExchangeRateProps {
  fromToken: Token | null;
  toToken: Token | null;
}

interface ExchangeRateContentProps {
  fromToken: Token;
  toToken: Token;
}

function formatExchangeRate(fromToken: Token, toToken: Token): string {
  if (toToken.price <= 0) return "0";

  return (fromToken.price / toToken.price).toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
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
      className="font-mono text-xs text-muted-fg"
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

import { useState } from "react";

import type { Token } from "@/types";
import { cn } from "@/lib/utils";

const FALLBACK_COLORS = [
  "bg-muted",
  "bg-surface-2",
  "bg-secondary",
  "bg-accent",
  "bg-background",
  "bg-popover",
] as const;

export interface TokenIconProps {
  token: Token;
  className?: string;
}

function getFallbackColor(symbol: string): string {
  const code = symbol.charCodeAt(0);
  return FALLBACK_COLORS[code % FALLBACK_COLORS.length];
}

export function TokenIcon({ token, className }: TokenIconProps) {
  const [hasError, setHasError] = useState(false);
  const fallbackLetter = token.symbol.charAt(0).toUpperCase();

  if (hasError) {
    return (
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border border-muted text-xs text-fg",
          getFallbackColor(token.symbol),
          className,
        )}
        aria-hidden="true"
      >
        {fallbackLetter}
      </span>
    );
  }

  return (
    <img
      src={token.icon}
      alt=""
      className={cn("size-5 shrink-0 rounded-full", className)}
      onError={() => setHasError(true)}
    />
  );
}

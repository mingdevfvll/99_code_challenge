import type { Token } from "@/types";

const DISPLAY_LOCALE = "en-US" as const;

const EXCHANGE_RATE_FORMAT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 6,
};

const USD_FORMAT: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
};

export function formatExchangeRate(fromToken: Token, toToken: Token): string {
  if (toToken.price <= 0) return "0";

  const rate = fromToken.price / toToken.price;
  return rate.toLocaleString(DISPLAY_LOCALE, EXCHANGE_RATE_FORMAT);
}

export function formatUsd(price: number): string {
  return price.toLocaleString(DISPLAY_LOCALE, USD_FORMAT);
}

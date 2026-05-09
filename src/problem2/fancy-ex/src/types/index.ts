/** Raw shape of each entry from `prices.json` */
export interface TokenPrice {
  currency: string;
  date: string;
  price: number;
}

/** Processed token used throughout the app */
export interface Token {
  symbol: string;
  price: number;
  /** Public URL path, e.g. `/images/ETH.svg` */
  icon: string;
}

export type { SwapFormValues } from "@/lib/schema";

export type SwapStatus = "idle" | "loading" | "success" | "error";

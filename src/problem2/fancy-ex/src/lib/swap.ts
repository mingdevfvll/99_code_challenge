import type { SwapStatus } from "@/types";

const MOCK_SWAP_SUCCESS_RATE = 0.85;

const CONFETTI_CSS_VARS = [
  "--color-primary",
  "--color-bg",
  "--color-fg",
] as const;

export function getConfettiColors(): string[] {
  const styles = getComputedStyle(document.documentElement);
  return CONFETTI_CSS_VARS.map((name) => styles.getPropertyValue(name).trim()).filter(
    Boolean,
  );
}

export function didMockSwapSucceed(): boolean {
  return Math.random() < MOCK_SWAP_SUCCESS_RATE;
}

export function formatStatusMessage(status: SwapStatus): string | null {
  if (status === "success") return "Swap confirmed. Your mock trade is complete.";
  if (status === "error") return "Swap failed. Please try again.";
  return null;
}

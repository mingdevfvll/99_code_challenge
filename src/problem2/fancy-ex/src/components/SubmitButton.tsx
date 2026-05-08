import { motion } from "framer-motion";

import type { SwapStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SubmitButtonProps {
  status: SwapStatus;
  disabled: boolean;
}

interface SubmitButtonContent {

  label: string;
  className: string;
  isSpinning?: boolean;
}

const SUBMIT_BUTTON_CONTENT: Record<SwapStatus, SubmitButtonContent> = {
  idle: {

    label: "SWAP",
    className: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  loading: {

    label: "SWAPPING...",
    className: "bg-primary/80 text-primary-foreground hover:bg-primary/80",
    isSpinning: true,
  },
  success: {

    label: "SWAP SUCCESSFUL",
    className: "bg-success text-primary-foreground hover:bg-success",
  },
  error: {

    label: "FAILED — RETRY",
    className: "bg-error text-primary-foreground hover:bg-error",
  },
};

export function SubmitButton({ status, disabled }: SubmitButtonProps) {
  const content = SUBMIT_BUTTON_CONTENT[status];

  return (
    <Button
      asChild
      type="submit"
      disabled={disabled}
      className={cn(
        "h-11 w-full font-mono font-medium uppercase tracking-wider disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
        content.className,
      )}
    >
      <motion.button
        type="submit"
        disabled={disabled}
        layout
        transition={{ duration: 0.2 }}
      >
        <motion.span layout="position">{content.label}</motion.span>
      </motion.button>
    </Button>
  );
}

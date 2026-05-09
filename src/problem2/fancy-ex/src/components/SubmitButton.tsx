import { motion } from "framer-motion";

import type { SwapStatus } from "@/types";
import { CubeLoader } from "@/components/CubeLoader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SubmitButtonProps {
  status: SwapStatus;
  disabled: boolean;
}

interface SubmitButtonContent {
  label: string;
  className: string;
}

const IDLE_BUTTON_CLASS =
  "bg-primary text-primary-foreground hover:bg-primary/90";

const SUBMIT_BUTTON_CONTENT: Record<SwapStatus, SubmitButtonContent> = {
  idle: {
    label: "SWAP",
    className: IDLE_BUTTON_CLASS,
  },
  loading: {
    label: "",
    className: IDLE_BUTTON_CLASS + " pointer-events-none disabled:opacity-80",
  },
  success: {
    label: "SWAP SUCCESSFUL",
    className: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  error: {
    label: "FAILED — RETRY",
    className: "bg-error text-primary-foreground hover:bg-error",
  },
};

export function SubmitButton({ status, disabled }: SubmitButtonProps) {
  const content = SUBMIT_BUTTON_CONTENT[status];
  const isLoading = status === "loading";

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
        aria-busy={isLoading}
        layout
        transition={{ duration: 0.2 }}
      >
        {isLoading ? (
          <span className="relative flex w-full items-center justify-center py-0.5">
            <CubeLoader />
          </span>
        ) : (
          <motion.span layout="position">{content.label}</motion.span>
        )}
      </motion.button>
    </Button>
  );
}

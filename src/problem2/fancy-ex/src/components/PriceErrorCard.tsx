import { AlertCircle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cardVariants } from "@/lib/motion";

export interface PriceErrorCardProps {
  isRetrying: boolean;
  onRetry: () => void;
}

export function PriceErrorCard({ isRetrying, onRetry }: PriceErrorCardProps) {
  return (
    <motion.section
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md rounded-xl border border-muted bg-surface p-6 shadow-sm"
      aria-label="Swap form error"
    >
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5 text-error" aria-hidden="true" />
          <p className="font-sans text-sm font-semibold text-fg">
            Failed to load token prices
          </p>
        </div>
        <p className="font-mono text-xs text-muted-fg">
          Source: interview.switcheo.com
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={isRetrying}
          onClick={onRetry}
          className="h-10 border-muted bg-surface text-fg hover:border-primary hover:bg-surface-2 hover:text-primary"
        >
          <RotateCcw
            data-icon="inline-start"
            className={isRetrying ? "animate-spin" : undefined}
            aria-hidden="true"
          />
          Retry
        </Button>
      </div>
    </motion.section>
  );
}

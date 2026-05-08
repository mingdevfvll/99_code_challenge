import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

export interface SwapArrowProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SwapArrow({ onClick, disabled = false }: SwapArrowProps) {
  const [rotate, setRotate] = useState(0);

  function handleClick() {
    if (disabled) return;

    setRotate((currentRotate) => currentRotate + 180);
    onClick();
  }

  return (
    <div className="-my-3 flex justify-center">
      <Button
        asChild
        type="button"
        variant="outline"
        aria-label="Swap direction"
        disabled={disabled}
        className="size-8 rounded-full border-muted bg-surface p-0 text-muted-fg transition-colors duration-200 hover:border-primary hover:bg-surface-2 hover:text-primary [&_svg]:size-3.5"
      >
        <motion.button
          type="button"
          disabled={disabled}
          onClick={handleClick}
          animate={{ rotate }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ArrowUpDown aria-hidden="true" />
        </motion.button>
      </Button>
    </div>
  );
}

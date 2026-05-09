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
        className="size-10 shadow-sm rounded-full border-none border-muted bg-black dark:bg-white p-0 text-muted-fg transition-colors duration-200 hover:border-primary hover:bg-black/60 hover:dark:bg-gray-300 hover:text-primary [&_svg]:size-5"
      >
        <motion.button
          type="button"
          disabled={disabled}
          onClick={handleClick}
          animate={{ rotate }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ArrowUpDown
            aria-hidden="true"
            className="text-white dark:text-black"
          />
        </motion.button>
      </Button>
    </div>
  );
}

import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useIsClientMounted } from "@/hooks/useIsClientMounted";

export function ThemeToggle() {
  const isClientMounted = useIsClientMounted();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = "Toggle theme";

  function handleToggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <Button
      asChild
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      className="fixed z-10 right-4 top-4 size-9 rounded-lg border-muted bg-surface text-fg transition-colors duration-200 hover:border-primary hover:bg-surface-2 hover:text-primary [&_svg]:size-4"
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={handleToggleTheme}
      >
        {isClientMounted && isDark ? (
          <Moon aria-hidden="true" />
        ) : (
          <Sun aria-hidden="true" />
        )}
      </motion.button>
    </Button>
  );
}

import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import { AsciiLogo } from "@/components/AsciiLogo";
import { DotFieldBackground } from "@/components/DotFieldBackground";
import { SwapForm } from "@/components/SwapForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function App() {
  const [cardReady, setCardReady] = useState(false);

  return (
    <main
      className="flex min-h-screen overflow-hidden relative flex-col items-center justify-center bg-surface dark:bg-bg px-4 py-12"
      aria-label="Currency swap"
    >
      <ThemeToggle />
      <div className="flex w-full max-w-md flex-col items-center gap-6 relative z-10">
        <AsciiLogo onComplete={() => setCardReady(true)} />
        <AnimatePresence>{cardReady && <SwapForm />}</AnimatePresence>
      </div>
      <DotFieldBackground />
    </main>
  );
}

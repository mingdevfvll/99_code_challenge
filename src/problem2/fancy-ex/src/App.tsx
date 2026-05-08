import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import { AsciiLogo } from "@/components/AsciiLogo";
import { SwapForm } from "@/components/SwapForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function App() {
  const [cardReady, setCardReady] = useState(false);

  return (
    <main
      className="bg-grid flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12"
      aria-label="Currency swap"
    >
      <ThemeToggle />
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <AsciiLogo onComplete={() => setCardReady(true)} />
        <AnimatePresence>{cardReady && <SwapForm />}</AnimatePresence>
      </div>
    </main>
  );
}

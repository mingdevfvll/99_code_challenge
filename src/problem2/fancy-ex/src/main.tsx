import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/providers/theme-provider";
import App from "@/App";
import "@/index.css";

const queryClient = new QueryClient();
const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Root element was not found.");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);

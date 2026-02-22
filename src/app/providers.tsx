"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { GenerationProvider } from "@/contexts/GenerationContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <GenerationProvider>
        {children}
        <Toaster richColors closeButton position="bottom-right" />
      </GenerationProvider>
    </ThemeProvider>
  );
}

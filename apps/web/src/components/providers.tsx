"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { lazy } from "react";

import { queryClient } from "@/utils/orpc";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })),
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}

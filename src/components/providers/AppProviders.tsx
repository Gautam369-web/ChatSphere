"use client";

import React, { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30s
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </NextThemesProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

export default AppProviders;

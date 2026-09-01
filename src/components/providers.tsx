"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import PlatformSettings from "@/components/common/PlatformSettings";
import "@/i18n";
import "@/lib/appSettings";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* Applies the platform's defaults before anything formats a date, and
            carries the maintenance notice onto every panel. */}
        <PlatformSettings />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

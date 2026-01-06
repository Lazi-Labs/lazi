'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SocketProvider } from './socket-provider';
import { builder } from '@builder.io/react';
import '@/lib/builder-registry';

// Initialize Builder.io
if (process.env.NEXT_PUBLIC_BUILDER_API_KEY) {
  builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SocketProvider tenantId={tenantId}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </SocketProvider>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

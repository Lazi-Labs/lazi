'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useUIStore } from '@/stores/ui-store';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DevMode } from '@/components/dev-mode';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, token, hasHydrated } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();

  // TEMPORARY: Disable auth check for testing
  // useEffect(() => {
  //   if (hasHydrated && !isLoading && !isAuthenticated && !token) {
  //     router.push('/login');
  //   }
  // }, [isAuthenticated, isLoading, token, hasHydrated, router]);

  // // Show loading while hydrating or checking auth
  // if (!hasHydrated || isLoading) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  // // Redirect handled in useEffect, show nothing while redirecting
  // if (!isAuthenticated && !token) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  return (
    <DevMode devOnly={process.env.NODE_ENV !== 'production'}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-56"
        )}>
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </DevMode>
  );
}

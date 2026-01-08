'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useUIStore } from '@/stores/ui-store';
import { Loader2, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DevMode } from '@/components/dev-mode';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, token, hasHydrated } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        {/* Desktop Sidebar - rendered directly, has its own hidden md:flex */}
        <Sidebar />
        
        {/* Mobile Sidebar Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} isMobile />
          </SheetContent>
        </Sheet>
        
        <div className={cn(
          "transition-all duration-300",
          "md:ml-56",
          sidebarCollapsed && "md:ml-16"
        )}>
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileMenuOpen(true)}
              className="min-h-[44px] min-w-[44px]"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
            <span className="font-semibold">Lazi CRM</span>
          </header>
          
          {/* Desktop Header */}
          <div className="hidden md:block">
            <Header />
          </div>
          
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </DevMode>
  );
}

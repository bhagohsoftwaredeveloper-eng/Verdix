'use client';

import React, { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { WindowControls } from '@/components/window-controls';
import { AppBreadcrumbs } from '@/components/app-breadcrumbs';
import { NavigationProgress } from '@/components/navigation-progress';
import { queryClient } from './layout-nav-config';
import { useAppLayout } from './use-app-layout';
import { AppSidebar } from './AppSidebar';
import { NotificationsBell } from './NotificationsBell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const {
    user, isUserLoading, isPOSPage,
    businessName, hasPermission, getInitials,
    filteredNavItems, filteredOtherNavItems,
    pathname,
  } = useAppLayout();

  if (isPOSPage) return <>{children}</>;

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <SidebarProvider className="h-screen overflow-hidden">
        <AppSidebar
          user={user}
          businessName={businessName}
          hasPermission={hasPermission}
          filteredNavItems={filteredNavItems}
          filteredOtherNavItems={filteredOtherNavItems}
          pathname={pathname}
          getInitials={getInitials}
        />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-30 flex items-center h-16 gap-4 px-4 border-b bg-background/80 backdrop-blur-sm sm:px-6 non-printable window-drag">
            <div className="flex items-center gap-4 window-no-drag">
              <SidebarTrigger />
              <AppBreadcrumbs />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <NotificationsBell user={user} />
              <WindowControls />
            </div>
          </header>
          <main className="flex-1 flex flex-col overflow-auto p-4 sm:p-6 min-h-0">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </QueryClientProvider>
  );
}

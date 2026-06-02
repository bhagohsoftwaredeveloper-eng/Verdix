'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Toaster = dynamic(
  () => import('@/components/ui/toaster').then((mod) => ({ default: mod.Toaster })),
  { ssr: false }
);

import { ThemeProvider } from '@/components/theme-provider';
import { LicenseGate } from '@/components/license-gate';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LicenseGate>{children}</LicenseGate>
      <Toaster />
    </ThemeProvider>
  );
}

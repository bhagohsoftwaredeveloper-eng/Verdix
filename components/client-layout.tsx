'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Toaster = dynamic(
  () => import('@/components/ui/toaster').then((mod) => ({ default: mod.Toaster })),
  { ssr: false }
);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

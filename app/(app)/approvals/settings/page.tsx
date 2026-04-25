'use client';

import React from 'react';
import { ApprovalSettings } from '@/components/approvals/approval-settings';
import { useRouter } from 'next/navigation';

export default function ApprovalSettingsPage() {
  const router = useRouter();
  
  return (
    <div className="h-full">
      <ApprovalSettings onBack={() => router.back()} />
    </div>
  );
}

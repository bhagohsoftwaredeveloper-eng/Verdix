'use client';

import React from 'react';
import { ApprovalsKanban } from '@/components/approvals/approvals-kanban';

export default function ApprovalsPage() {
  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))]">
      <ApprovalsKanban />
    </div>
  );
}

'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ApprovalsKanban } from './approvals-kanban';
import { ClipboardCheck } from 'lucide-react';

interface ApprovalsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApprovalsDrawer({ open, onOpenChange }: ApprovalsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="top" 
        className="h-[100dvh] w-screen max-w-none p-0 border-none overflow-hidden flex flex-col pt-10"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Approvals Management</SheetTitle>
          <SheetDescription>View and manage pending approvals in a Kanban board.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden px-4 pb-4 sm:px-6 lg:px-8">
            <ApprovalsKanban open={open} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

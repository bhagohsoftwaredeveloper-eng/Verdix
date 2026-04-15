'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ApprovalSettings } from './approval-settings';

interface WorkflowSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
}

export function WorkflowSettingsDrawer({ open, onOpenChange, onBack }: WorkflowSettingsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="top" 
        className="h-[100dvh] w-screen max-w-none p-0 border-none overflow-hidden flex flex-col pt-10"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Workflow Settings</SheetTitle>
          <SheetDescription>Configure approval workflows for different transaction types.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden px-4 pb-4 sm:px-6 lg:px-8">
            <ApprovalSettings onBack={onBack} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

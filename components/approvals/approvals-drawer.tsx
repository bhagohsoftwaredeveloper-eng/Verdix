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
import { ClipboardCheck, GripHorizontal } from 'lucide-react';
import { useIsMobile, useIsAndroid } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ApprovalsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApprovalsDrawer({ open, onOpenChange }: ApprovalsDrawerProps) {
  const isMobile = useIsMobile();
  const isAndroid = useIsAndroid();
  const showMobile = isMobile || isAndroid;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={showMobile ? "bottom" : "top"} 
        className={cn(
            "h-[100dvh] w-screen max-w-full p-0 border-none flex flex-col pt-10 ring-0",
            showMobile ? "h-[94dvh] rounded-t-[2.5rem] pt-2" : "pt-10"
        )}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Approvals Management</SheetTitle>
          <SheetDescription>View and manage pending approvals.</SheetDescription>
        </SheetHeader>
        
        {showMobile && (
            <div className="w-full flex justify-center py-2 shrink-0">
                <div className="w-12 h-1.5 bg-secondary rounded-full" />
            </div>
        )}

        <div className={cn(
            "flex-1 h-full min-h-0 overflow-hidden",
            showMobile ? "px-0 pb-0" : "px-4 pb-4 sm:px-6 lg:px-8"
        )}>
            <ApprovalsKanban open={open} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

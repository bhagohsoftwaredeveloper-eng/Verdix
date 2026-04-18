'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { TransferBoard } from './transfer-board/TransferBoard';
import { Button } from '@/components/ui/button';
import { Kanban, X } from 'lucide-react';

interface TransferBoardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferBoardDrawer({ open, onOpenChange }: TransferBoardDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-screen w-screen p-0 flex flex-col border-none">
        <div className="p-6 border-b bg-background z-10 flex items-center justify-between">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <Kanban className="h-6 w-6 text-primary" />
              Transfer Board
            </SheetTitle>
            <SheetDescription>
              Drag and drop products between warehouses to transfer stock.
            </SheetDescription>
          </SheetHeader>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <X className="h-6 w-6" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 overflow-hidden p-6">
          <TransferBoard />
        </div>
      </SheetContent>
    </Sheet>
  );
}

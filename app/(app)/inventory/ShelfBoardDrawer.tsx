'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import ShelfBoard from './shelf-board/ShelfBoard';
import { Button } from '@/components/ui/button';
import { Rows3, X } from 'lucide-react';

interface ShelfBoardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShelfBoardDrawer({ open, onOpenChange }: ShelfBoardDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-screen w-screen p-0 flex flex-col border-none">
        <div className="p-6 border-b bg-background z-10 flex items-center justify-between">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <Rows3 className="h-6 w-6 text-primary" />
              Shelf Transfer Board
            </SheetTitle>
            <SheetDescription>
              Organize product stock across different shelf locations.
            </SheetDescription>
          </SheetHeader>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <X className="h-6 w-6" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 overflow-hidden p-6">
          <ShelfBoard />
        </div>
      </SheetContent>
    </Sheet>
  );
}

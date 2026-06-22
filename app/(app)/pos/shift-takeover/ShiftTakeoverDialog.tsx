'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, History, Play } from 'lucide-react';
import type { ShiftTakeoverDialogProps } from './shift-takeover-types';

export function ShiftTakeoverDialog({
  isOpen,
  onContinue,
  onStartNew,
  previousCashierName,
}: ShiftTakeoverDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            Active Session Found
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            An active shift from <span className="font-bold text-foreground">{previousCashierName}</span> is still running on this terminal.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
             <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Would you like to continue the existing transaction or start a fresh shift?
             </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col">
          <Button
            type="button"
            className="w-full h-16 text-lg flex items-center justify-between px-6 bg-primary hover:bg-primary/90"
            onClick={onContinue}
          >
            <div className="flex items-center gap-3">
              <History className="h-5 w-5" />
              <div className="text-left">
                <div className="font-bold">Continue Transaction</div>
                <div className="text-xs font-normal opacity-90">Resume {previousCashierName}'s session</div>
              </div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-16 text-lg flex items-center justify-between px-6 border-2"
            onClick={onStartNew}
          >
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5" />
              <div className="text-left">
                <div className="font-bold">Start New Shift</div>
                <div className="text-xs font-normal text-muted-foreground">End current session and start fresh</div>
              </div>
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

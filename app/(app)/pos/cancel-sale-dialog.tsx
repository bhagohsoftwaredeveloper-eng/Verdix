
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
import { Trash2, XCircle } from 'lucide-react';

interface CancelSaleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCancelSelected: () => void;
  onCancelAll: () => void;
  hasSelectedItem: boolean;
}

export function CancelSaleDialog({
  isOpen,
  onOpenChange,
  onCancelSelected,
  onCancelAll,
  hasSelectedItem
}: CancelSaleDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[400px] p-6 flex flex-col">
        <DialogHeader className="pb-4 text-center sm:text-center">
          <DialogTitle className="text-xl text-destructive font-bold flex items-center justify-center gap-2">
            <XCircle className="w-5 h-5" />
            Cancel Transaction
          </DialogTitle>
          <DialogDescription className="text-sm mt-1">
            What would you like to remove from the current sale?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2">
          <Button 
            variant="outline" 
            className="h-16 justify-start gap-4 text-sm border-slate-200 hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all group"
            onClick={() => {
                onCancelSelected();
                onOpenChange(false);
            }}
            disabled={!hasSelectedItem}
          >
            <div className="p-2 bg-slate-100 rounded-md group-hover:bg-destructive/10">
              <Trash2 className="w-5 h-5 text-slate-500 group-hover:text-destructive" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base">Void Selected Item</div>
              <div className="text-xs text-slate-500">Remove only the highlighted line</div>
            </div>
          </Button>

          <Button 
            variant="outline"
            className="h-16 justify-start gap-4 text-sm border-slate-200 hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all group"
            onClick={() => {
                onCancelAll();
                onOpenChange(false);
            }}
          >
            <div className="p-2 bg-slate-100 rounded-md group-hover:bg-destructive/10">
              <XCircle className="w-5 h-5 text-slate-500 group-hover:text-destructive" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base">Clear Entire Sale</div>
              <div className="text-xs text-slate-500">Reset cart and clear all items</div>
            </div>
          </Button>
        </div>
        <DialogFooter className="sm:justify-end mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-sm">
            Keep Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

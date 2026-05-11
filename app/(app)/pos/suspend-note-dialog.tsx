'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag } from 'lucide-react';

interface SuspendNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (note: string) => void;
}

export function SuspendNoteDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: SuspendNoteDialogProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNote('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(note.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-white p-6 space-y-6">
          <DialogHeader className="space-y-3">
            <div className="flex justify-center">
              <div className="bg-orange-50 p-3 rounded-2xl">
                <Tag className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-extrabold text-center text-slate-800">
              Suspend Transaction
            </DialogTitle>
            <p className="text-sm text-slate-500 text-center px-4">
              Add a note or description to identify this transaction later.
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-tight ml-1">
                Note / Description
              </Label>
              <Input
                autoFocus
                placeholder="e.g. Waiting for wallet, Customer name..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                }}
                className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-orange-500 rounded-xl px-4"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 h-12 rounded-xl font-bold text-slate-600 border-slate-200 hover:bg-slate-50 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 h-12 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200/50 transition-all active:scale-[0.98]"
              onClick={handleConfirm}
            >
              Suspend
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

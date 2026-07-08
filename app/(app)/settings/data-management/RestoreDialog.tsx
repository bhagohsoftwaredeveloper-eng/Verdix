'use client';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupToRestore: string | null;
  confirmText: string;
  onConfirmTextChange: (v: string) => void;
  restoring: boolean;
  onConfirm: () => void;
}

export function RestoreDialog({ open, onOpenChange, backupToRestore, confirmText, onConfirmTextChange, restoring, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-orange-600">Restore Database?</AlertDialogTitle>
          <AlertDialogDescription>
            This will overwrite your current database with the data from <span className="font-bold">{backupToRestore}</span>.
            All data added after this backup was created will be permanently lost.
          </AlertDialogDescription>
          <div className="py-2">
            <Label htmlFor="restore-confirm-text" className="text-xs text-muted-foreground mb-1 block">
              Type <span className="font-bold text-orange-600">RESTORE</span> to proceed
            </Label>
            <Input
              id="restore-confirm-text"
              value={confirmText}
              onChange={(e) => onConfirmTextChange(e.target.value)}
              placeholder="Type RESTORE"
              autoComplete="off"
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-orange-600 text-white hover:bg-orange-700"
            onClick={onConfirm}
            disabled={confirmText !== 'RESTORE' || restoring}
          >
            {restoring ? 'Restoring...' : 'Confirm Restore'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

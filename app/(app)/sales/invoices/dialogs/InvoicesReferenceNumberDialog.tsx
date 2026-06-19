'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Props = { open: boolean; onClose: () => void; tempReferenceNumber: string; setTempReferenceNumber: (v: string) => void; onApply: () => void };

export function InvoicesReferenceNumberDialog({ open, onClose, tempReferenceNumber, setTempReferenceNumber, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Filter by Reference #</DialogTitle></DialogHeader>
        <div className="py-4">
          <Label>Reference Number</Label>
          <Input
            value={tempReferenceNumber}
            onChange={e => setTempReferenceNumber(e.target.value)}
            placeholder="Enter ref #"
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

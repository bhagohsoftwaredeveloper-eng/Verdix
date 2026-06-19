'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Props = { open: boolean; onClose: () => void; tempReceiptNumber: string; setTempReceiptNumber: (v: string) => void; onApply: () => void };

export function InvoicesReceiptNumberDialog({ open, onClose, tempReceiptNumber, setTempReceiptNumber, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Filter by Receipt #</DialogTitle></DialogHeader>
        <div className="py-4">
          <Label>Receipt Number</Label>
          <Input
            value={tempReceiptNumber}
            onChange={e => setTempReceiptNumber(e.target.value)}
            placeholder="Enter receipt #"
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

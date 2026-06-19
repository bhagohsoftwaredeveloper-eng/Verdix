'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Props = { open: boolean; onClose: () => void; tempTransactionSource: string; setTempTransactionSource: (v: string) => void; onApply: () => void };

export function InvoicesTransactionSourceDialog({ open, onClose, tempTransactionSource, setTempTransactionSource, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Filter by Transaction From</DialogTitle></DialogHeader>
        <div className="py-4">
          <Label>Source</Label>
          <Select value={tempTransactionSource} onValueChange={setTempTransactionSource}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="POS">POS</SelectItem>
              <SelectItem value="Backoffice">Backoffice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

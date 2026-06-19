'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Props = { open: boolean; onClose: () => void; tempReferenceType: string; setTempReferenceType: (v: string) => void; onApply: () => void };

export function InvoicesReferenceTypeDialog({ open, onClose, tempReferenceType, setTempReferenceType, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Filter by Reference Type</DialogTitle></DialogHeader>
        <div className="py-4">
          <Label>Type</Label>
          <Select value={tempReferenceType} onValueChange={setTempReferenceType}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Sales Invoice">Sales Invoice</SelectItem>
              <SelectItem value="Delivery Receipt">Delivery Receipt</SelectItem>
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

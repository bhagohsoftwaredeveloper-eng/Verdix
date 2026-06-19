'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Props = { open: boolean; onClose: () => void; tempCustomer: string; setTempCustomer: (v: string) => void; onApply: () => void };

export function InvoicesCustomerDialog({ open, onClose, tempCustomer, setTempCustomer, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Filter by Customer</DialogTitle></DialogHeader>
        <div className="py-4">
          <Label>Customer Name</Label>
          <Input
            value={tempCustomer}
            onChange={e => setTempCustomer(e.target.value)}
            placeholder="Enter customer name..."
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

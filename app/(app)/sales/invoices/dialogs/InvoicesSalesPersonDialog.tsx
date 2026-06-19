'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Props = { open: boolean; onClose: () => void; tempSalesPerson: string; setTempSalesPerson: (v: string) => void; uniqueSalesPersons: any[]; onApply: () => void };

export function InvoicesSalesPersonDialog({ open, onClose, tempSalesPerson, setTempSalesPerson, uniqueSalesPersons, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Filter by Sales Person</DialogTitle></DialogHeader>
        <div className="py-4">
          <Label>Sales Person</Label>
          <Select value={tempSalesPerson} onValueChange={setTempSalesPerson}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select person" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unassigned">Unassigned / Admin</SelectItem>
              {uniqueSalesPersons.map((sp: any) => (
                <SelectItem key={sp} value={sp}>{sp}</SelectItem>
              ))}
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

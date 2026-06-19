'use client';

import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Props = { open: boolean; onClose: () => void; tempDateRange: DateRange | undefined; setTempDateRange: (v: DateRange | undefined) => void; onApply: () => void };

export function InvoicesDateRangeDialog({ open, onClose, tempDateRange, setTempDateRange, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-fit">
        <DialogHeader><DialogTitle>Filter by Date Range</DialogTitle></DialogHeader>
        <div className="py-4">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempDateRange?.from}
            selected={tempDateRange}
            onSelect={setTempDateRange}
            numberOfMonths={1}
            className="rounded-md border mx-auto"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setTempDateRange(undefined)}>Clear</Button>
          <Button onClick={onApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

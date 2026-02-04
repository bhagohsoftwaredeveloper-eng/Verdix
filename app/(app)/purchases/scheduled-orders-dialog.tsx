'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ShoppingCart, Loader2 } from 'lucide-react';
import { Supplier } from '@/lib/types';
import { getSuppliers } from '../products/actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

export function ScheduledOrdersDialog({
  onCreateOrder
}: {
  onCreateOrder: (supplierId: string) => void
}) {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getSuppliers().then(data => {
        // Filter only suppliers with a schedule
        const scheduled = data.filter((s: Supplier) => s.orderSchedule && s.orderSchedule.trim() !== '');
        setSuppliers(scheduled);
        setLoading(false);
      });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
           <CalendarIcon className="mr-2 h-4 w-4" />
           Scheduled Orders
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Supplier Schedules</DialogTitle>
          <DialogDescription>
            View suppliers with defined order schedules.
          </DialogDescription>
        </DialogHeader>
        
        <div className="rounded-md border mt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                   <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                   </TableCell>
                 </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No order schedules found. Set schedules in the "Manage Suppliers" dialog.
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map(supplier => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                         <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                                {supplier.orderSchedule}
                            </span>
                         </div>
                    </TableCell>
                     <TableCell className="text-muted-foreground text-sm">
                        {supplier.contactNumber || supplier.mobilePhone || supplier.email || '-'}
                     </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => {
                        onCreateOrder(supplier.id);
                        setOpen(false);
                      }}>
                        <ShoppingCart className="mr-2 h-3.5 w-3.5" />
                        Order Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

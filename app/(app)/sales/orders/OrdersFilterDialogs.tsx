'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Sale, SalesPerson, Customer } from '@/lib/types';
import type { OrderFilters, OrderFilterDialogOpen } from './use-orders-filters';

const ALL_STATUSES: Sale['status'][] = ['Pending', 'To Deliver', 'Fully Delivered', 'Paid', 'Shipped', 'Delivered', 'Returned', 'Failed'];

type Props = {
  dialogOpen: OrderFilterDialogOpen;
  setDialogOpen: React.Dispatch<React.SetStateAction<OrderFilterDialogOpen>>;
  filters: OrderFilters;
  handleFilterChange: (key: keyof OrderFilters, value: string) => void;
  salesPersons: SalesPerson[];
  customers: Customer[];
};

export function OrdersFilterDialogs({ dialogOpen, setDialogOpen, filters, handleFilterChange, salesPersons, customers }: Props) {
  const close = (key: keyof OrderFilterDialogOpen) => setDialogOpen(p => ({ ...p, [key]: false }));

  return (
    <>
      <Dialog open={dialogOpen.status} onOpenChange={(v) => setDialogOpen(p => ({ ...p, status: v }))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Status</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={filters.status} onValueChange={(val) => { handleFilterChange('status', val === 'all' ? '' : val); close('status'); }}>
              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.date} onOpenChange={(v) => setDialogOpen(p => ({ ...p, date: v }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Filter Date Range</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>From</Label>
              <Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>To</Label>
              <Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.salesPerson} onOpenChange={(v) => setDialogOpen(p => ({ ...p, salesPerson: v }))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Sales Person</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={filters.salesPersonId} onValueChange={(val) => { handleFilterChange('salesPersonId', val === 'all' ? '' : val); close('salesPerson'); }}>
              <SelectTrigger><SelectValue placeholder="Select Sales Person" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Persons</SelectItem>
                {salesPersons.map(sp => <SelectItem key={sp.id} value={sp.id.toString()}>{sp.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.salesArea} onOpenChange={(v) => setDialogOpen(p => ({ ...p, salesArea: v }))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Sales Area</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="Enter Sales Area..." value={filters.salesArea} onChange={(e) => handleFilterChange('salesArea', e.target.value)} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.customer} onOpenChange={(v) => setDialogOpen(p => ({ ...p, customer: v }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Filter Customer</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={filters.customerId} onValueChange={(val) => { handleFilterChange('customerId', val === 'all' ? '' : val); close('customer'); }}>
              <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.reference} onOpenChange={(v) => setDialogOpen(p => ({ ...p, reference: v }))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Reference</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="Enter Reference #" value={filters.reference} onChange={(e) => handleFilterChange('reference', e.target.value)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

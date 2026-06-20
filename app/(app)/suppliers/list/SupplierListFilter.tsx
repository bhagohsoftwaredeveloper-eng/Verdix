'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { SupplierFilters } from '../actions';

type Props = {
  filters: SupplierFilters;
  setFilters: React.Dispatch<React.SetStateAction<SupplierFilters>>;
};

export function SupplierListFilter({ filters, setFilters }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="mr-2 h-4 w-4" />
          Filter
          {Object.keys(filters).length > 0 && (
            <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              {Object.keys(filters).length}
            </span>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Filter Suppliers</AlertDialogTitle>
          <AlertDialogDescription>Narrow down your supplier list by applying filters.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Select
              value={filters.paymentTerms || 'all'}
              onValueChange={value =>
                setFilters(prev => ({ ...prev, paymentTerms: value === 'all' ? undefined : value }))
              }
            >
              <SelectTrigger id="paymentTerms">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {['COD', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="orderSchedule">Order Schedule</Label>
            <Input
              id="orderSchedule"
              placeholder="e.g. Monday"
              value={filters.orderSchedule || ''}
              onChange={e => setFilters(prev => ({ ...prev, orderSchedule: e.target.value || undefined }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="Search company..."
              value={filters.company || ''}
              onChange={e => setFilters(prev => ({ ...prev, company: e.target.value || undefined }))}
            />
          </div>
          <div className="flex items-center space-x-2 py-2">
            <input
              type="checkbox"
              id="hasBalance"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={filters.hasBalance || false}
              onChange={e => setFilters(prev => ({ ...prev, hasBalance: e.target.checked || undefined }))}
            />
            <Label htmlFor="hasBalance" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Show only suppliers with outstanding balance
            </Label>
          </div>
        </div>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => setFilters({})} className="mr-auto">Reset</Button>
          <AlertDialogAction>Apply Filters</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

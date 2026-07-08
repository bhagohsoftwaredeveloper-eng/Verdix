'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

type Props = {
  searchTerm: string;
  startDate: string;
  endDate: string;
  onSearch: (v: string) => void;
  onStartDate: (v: string) => void;
  onEndDate: (v: string) => void;
};

export function TransactionFilters({ searchTerm, startDate, endDate, onSearch, onStartDate, onEndDate }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/20 p-4 rounded-lg border border-dashed">
      <div className="md:col-span-2 space-y-1.5">
        <Label htmlFor="txn-search" className="text-[10px] uppercase font-bold text-muted-foreground">Search History</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            id="txn-search"
            placeholder="PO # or Reference..."
            className="pl-8 h-9 text-xs"
            value={searchTerm}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="txn-startDate" className="text-[10px] uppercase font-bold text-muted-foreground">From</Label>
        <Input id="txn-startDate" type="date" className="h-9 text-xs" value={startDate} onChange={e => onStartDate(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="txn-endDate" className="text-[10px] uppercase font-bold text-muted-foreground">To</Label>
        <Input id="txn-endDate" type="date" className="h-9 text-xs" value={endDate} onChange={e => onEndDate(e.target.value)} />
      </div>
    </div>
  );
}

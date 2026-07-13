'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export interface TransactionSearchBarProps {
  searchText: string;
  onSearchTextChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function TransactionSearchBar({
  searchText, onSearchTextChange,
  dateFrom, dateTo, onDateFromChange, onDateToChange,
  onClear, placeholder = 'Search SI #, SO #, or customer name', autoFocus,
}: TransactionSearchBarProps) {
  const hasAny = !!(searchText || dateFrom || dateTo);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="h-10 pl-9"
          placeholder={placeholder}
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          autoFocus={autoFocus}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">From</label>
          <Input type="date" className="h-9 text-xs" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
        </div>
        <div className="flex flex-1 items-center gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To</label>
          <Input type="date" className="h-9 text-xs" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>
        {hasAny && onClear && (
          <Button variant="ghost" size="sm" className="h-9 px-2 text-xs text-muted-foreground" onClick={onClear}>
            <X className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}

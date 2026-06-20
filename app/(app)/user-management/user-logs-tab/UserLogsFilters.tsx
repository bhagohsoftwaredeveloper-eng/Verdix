'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, RefreshCw } from 'lucide-react';
import { MODULE_OPTIONS, ACTION_OPTIONS } from './user-logs-types';

type Props = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  moduleFilter: string;
  setModuleFilter: (v: string) => void;
  actionFilter: string;
  setActionFilter: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  hasActiveFilters: boolean;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  onPageReset: () => void;
};

export function UserLogsFilters({
  searchQuery, setSearchQuery,
  moduleFilter, setModuleFilter,
  actionFilter, setActionFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  hasActiveFilters,
  onSearch, onClear, onRefresh, onPageReset,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Input
          placeholder="Search description, user..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          className="pr-8"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
            onClick={() => { setSearchQuery(''); onClear(); }}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      <Button size="icon" variant="secondary" onClick={onSearch}>
        <Search className="h-4 w-4" />
      </Button>

      <Select value={moduleFilter} onValueChange={v => { setModuleFilter(v); onPageReset(); }}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Module" />
        </SelectTrigger>
        <SelectContent>
          {MODULE_OPTIONS.map(m => (
            <SelectItem key={m} value={m}>{m === 'ALL' ? 'All Modules' : m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={actionFilter} onValueChange={v => { setActionFilter(v); onPageReset(); }}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          {ACTION_OPTIONS.map(a => (
            <SelectItem key={a} value={a}>{a === 'ALL' ? 'All Actions' : a}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); onPageReset(); }}
          className="w-[140px] text-sm"
        />
        <span className="text-muted-foreground text-sm">–</span>
        <Input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); onPageReset(); }}
          className="w-[140px] text-sm"
        />
      </div>

      <Button size="icon" variant="ghost" onClick={onRefresh} title="Refresh">
        <RefreshCw className="h-4 w-4" />
      </Button>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={onClear}>
          <X className="mr-1.5 h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}

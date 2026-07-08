'use client';

import { Table as ReactTable } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarIcon, Columns } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { TerminalSelector } from '@/components/TerminalSelector';
import type { ZReadingData } from './z-reading-preview';

interface Props {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  terminal: string;
  setTerminal: (id: string) => void;
  table: ReactTable<ZReadingData>;
  onShowReport: () => void;
}

export function ZReadingFilterBar({ dateRange, setDateRange, terminal, setTerminal, table, onShowReport }: Props) {
  return (
    <div className="flex items-end gap-4 p-1 bg-background rounded-lg">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-[300px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? <>{format(dateRange.from, 'yyyy-MM-dd')} - {format(dateRange.to, 'yyyy-MM-dd')}</> : format(dateRange.from, 'yyyy-MM-dd')
              ) : <span>Pick a date range</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus numberOfMonths={2} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Terminal</label>
        <TerminalSelector terminalId={terminal} onTerminalChange={setTerminal} showAllOption={true} />
      </div>

      <Button onClick={onShowReport} className="bg-white hover:bg-gray-100 text-black border border-gray-200 shadow-sm">
        Show Report
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto">
            <Columns className="mr-2 h-4 w-4" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {table.getAllColumns().filter(col => col.getCanHide()).map(col => (
            <DropdownMenuCheckboxItem
              key={col.id}
              className="capitalize"
              checked={col.getIsVisible()}
              onCheckedChange={val => col.toggleVisibility(!!val)}
            >
              {col.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

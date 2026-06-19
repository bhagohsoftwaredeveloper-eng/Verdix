import { format } from 'date-fns';
import { CalendarIcon, RefreshCcw, Eye } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TerminalSelector } from '@/components/TerminalSelector';
import { cn } from '@/lib/utils';
import type { Table } from '@tanstack/react-table';
import type { Cashier } from './cash-transfer-types';

type Props = {
  dateRange: DateRange | undefined;
  setDateRange: (v: DateRange | undefined) => void;
  terminalId: string;
  setTerminalId: (v: string) => void;
  cashierId: string;
  setCashierId: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  cashiers: Cashier[];
  refetch: () => void;
  table: Table<any>;
};

export function CashTransferFilterBar({
  dateRange, setDateRange,
  terminalId, setTerminalId,
  cashierId, setCashierId,
  type, setType,
  cashiers, refetch, table,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('w-[240px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}</>
              ) : (
                format(dateRange.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <TerminalSelector terminalId={terminalId} onTerminalChange={setTerminalId} showAllOption={true} />

      {/* Cashier */}
      <Select value={cashierId} onValueChange={setCashierId}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Cashiers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Cashiers</SelectItem>
          {cashiers.map((c) => (
            <SelectItem key={c.uid} value={c.uid}>
              {c.display_name || c.username || c.uid}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type */}
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="deposit">Cash In (Deposit)</SelectItem>
          <SelectItem value="pickup">Cash Out (Pickup)</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
        <RefreshCcw className="h-4 w-4" />
      </Button>

      {/* Column Visibility */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto">
            <Eye className="h-4 w-4 mr-2" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {table.getAllColumns().filter((col) => col.getCanHide()).map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              className="capitalize"
              checked={col.getIsVisible()}
              onCheckedChange={(value) => col.toggleVisibility(!!value)}
            >
              {col.id.replace(/_/g, ' ')}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';


type DailySalesData = {
  date: string;
  transactionCount: number;
  totalRevenue: number;
};

import { TerminalSelector } from '@/components/TerminalSelector';

// ...

export default function SalesByDatePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSalesByDate = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      }
      if (terminal && terminal !== 'all') {
          params.append('terminalId', terminal);
      }

      const response = await fetch(`/api/sales/by-date?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setDailySales(result.data);
      } else {
        console.error('Failed to fetch sales by date:', result.error);
        setDailySales([]);
      }
    } catch (error) {
      console.error('Error fetching sales by date:', error);
      setDailySales([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesByDate();
  }, [dateRange, terminal]);

  const resetFilters = () => {
    setDateRange(undefined);
    setTerminal('all');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Sales by Date</CardTitle>
            <CardDescription>
              A summary of sales transactions for each day.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TerminalSelector 
                terminalId={terminal} 
                onTerminalChange={setTerminal} 
                showAllOption={true} 
            />
            <div className='w-2'></div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
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
            {(dateRange || terminal !== 'all') && (
                <Button variant="ghost" onClick={resetFilters} size="icon">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Reset filters</span>
                </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="text-muted-foreground">Loading sales data...</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">No. of Transactions</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailySales.length > 0 ? (
                dailySales.map(({ date, transactionCount, totalRevenue }) => (
                  <TableRow key={date}>
                    <TableCell className="font-medium">
                      {format(new Date(date), 'PP')}
                    </TableCell>
                    <TableCell className="text-right">{transactionCount}</TableCell>
                    <TableCell className="text-right">
                      ₱{totalRevenue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No sales found for the selected date range.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

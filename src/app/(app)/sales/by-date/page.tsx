
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
import type { Sale } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function SalesByDatePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const firestore = useFirestore();
  const salesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sales') : null),
    [firestore]
  );
  const { data: sales } = useCollection<Sale>(salesCollection);

  const dailySales = useMemo(() => {
    if (!sales) return [];
    
    const filteredSales = sales.filter(sale => {
      if (!dateRange || (!dateRange.from && !dateRange.to)) {
        return true;
      }
      const saleDate = new Date(sale.invoiceDate || sale.date);
      if (dateRange.from && saleDate < dateRange.from) {
        return false;
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (saleDate > toDate) {
          return false;
        }
      }
      return true;
    });

    const salesByDate = new Map<string, { transactionCount: number; totalRevenue: number }>();

    filteredSales.forEach(sale => {
      const dateStr = format(new Date(sale.invoiceDate || sale.date), 'PP');
      const existingEntry = salesByDate.get(dateStr);
      if (existingEntry) {
        existingEntry.transactionCount += 1;
        existingEntry.totalRevenue += sale.total;
      } else {
        salesByDate.set(dateStr, {
          transactionCount: 1,
          totalRevenue: sale.total,
        });
      }
    });

    return Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, dateRange]);

  const resetFilters = () => {
    setDateRange(undefined);
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
            {dateRange && (
                <Button variant="ghost" onClick={resetFilters} size="icon">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Reset filters</span>
                </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
                  <TableCell className="font-medium">{date}</TableCell>
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
      </CardContent>
    </Card>
  );
}

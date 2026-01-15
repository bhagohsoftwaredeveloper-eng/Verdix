
'use client';

import { useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, Search, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { mockSales } from '@/lib/data';

export default function ReturnedSalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const sales = mockSales;

  const returnedSales = useMemo(() => {
    if (!sales) return [];

    // First, filter for only returned sales.
    const returns = sales.filter(sale => sale.status === 'Returned');

    // Then, filter by the selected date range.
    const salesByDate = returns.filter(sale => {
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

    // Finally, filter by the search term.
    if (!searchTerm) {
      return salesByDate;
    }

    return salesByDate.filter(sale => {
      const term = searchTerm.toLowerCase();
      const customerMatch = sale.customer.name.toLowerCase().includes(term);
      const itemMatch = sale.items.some(item =>
        item.product.name.toLowerCase().includes(term)
      );
      return customerMatch || itemMatch;
    });
  }, [sales, dateRange, searchTerm]);

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Returned Sales</CardTitle>
        <CardDescription>
          Track and manage all returned sales transactions.
        </CardDescription>
        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by customer or item..."
              className="pl-8 sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
            <Button variant="ghost" onClick={resetFilters} size="icon" className={(searchTerm || dateRange) ? 'visible' : 'invisible'}>
              <X className="h-4 w-4" />
              <span className="sr-only">Reset filters</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Return Date</TableHead>
              <TableHead>Returned Items</TableHead>
              <TableHead className="text-right">Total Returned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returnedSales.length > 0 ? (
                returnedSales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{sale.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{sale.customer.contactNumber}</div>
                  </TableCell>
                  <TableCell>{format(new Date(sale.invoiceDate || sale.date), 'PP')}</TableCell>
                   <TableCell>
                    {sale.items.map(item => (
                      <div key={item.product.id}>
                        {item.quantity} x {item.product.name}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">
                        -₱{sale.total.toFixed(2)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No returned sales found for the selected criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

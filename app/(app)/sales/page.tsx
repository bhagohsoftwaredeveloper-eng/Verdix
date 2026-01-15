
'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Sale } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { CalendarIcon, Search, X } from 'lucide-react';

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await fetch('/api/sales');
        if (!response.ok) {
          throw new Error('Failed to fetch sales data');
        }
        const result = await response.json();
        if (result.success) {
          setSales(result.data);
        } else {
          console.error('Failed to fetch sales:', result.error);
        }
      } catch (error) {
        console.error('Error fetching sales:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSales();
  }, []);

  const getStatusInfo = (sale: Sale): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    switch (sale.status) {
      case 'Paid':
        return { text: 'Paid', variant: 'default' };
      case 'Failed':
      case 'Returned':
        return { text: sale.status, variant: 'destructive' };
      case 'Shipped':
      case 'Delivered':
        return { text: sale.status, variant: 'outline' };
      case 'Pending':
      default:
        return { text: 'Due', variant: 'secondary' };
    }
  };

  const filteredSales = useMemo(() => {
    if (!sales) return [];

    return sales.filter(sale => {
        // Date filter
        const saleDate = new Date(sale.invoiceDate || sale.date || new Date());
        if (dateRange?.from && saleDate < dateRange.from) return false;
        if (dateRange?.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            if (saleDate > toDate) return false;
        }

        // Search term filter
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        
        const idMatch = sale.id.toLowerCase().includes(term);
        const customerMatch = sale.customer.name.toLowerCase().includes(term);

        return idMatch || customerMatch;
    }).sort((a,b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [sales, searchTerm, dateRange]);

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
  };

  const hasActiveFilters = searchTerm || dateRange;

  return (
    <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Sales Transactions</CardTitle>
                <CardDescription>
                  A list of all POS sales to customers.
                </CardDescription>
              </div>
            </div>
             <div className="flex items-center justify-between gap-4 pt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by ID or customer..."
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
                {hasActiveFilters && (
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
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            Loading transactions...
                        </TableCell>
                    </TableRow>
                ) : filteredSales.length > 0 ? (
                  filteredSales.map((sale) => {
                    const displayDate = sale.invoiceDate || sale.date;
                    const statusInfo = getStatusInfo(sale);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.id.substring(0,7)}...</TableCell>
                        <TableCell>
                          <div className="font-medium">{sale.customer.name}</div>
                          <div className="text-sm text-muted-foreground hidden md:block">{sale.customer.contactNumber}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{displayDate ? format(new Date(displayDate), 'PP') : 'N/A'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{sale.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">₱{sale.total.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No transactions found for the selected criteria.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}

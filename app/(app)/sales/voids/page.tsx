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
import { useSalesInvoices } from '@/hooks/use-api';

import { TerminalSelector } from '@/components/TerminalSelector';

// ... 

export default function VoidedSalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  const [sales, setSales] = useState<Sale[]>([]); // Using Sale type for UI consistency
  const [isLoading, setIsLoading] = useState(true);

  // Use the new Transactions API
  useEffect(() => {
    const fetchVoidedSales = async () => {
      setIsLoading(true);
      try {
         const params = new URLSearchParams();
         params.append('status', 'Voided');
         if (dateRange?.from) {
             params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
         }
         if (dateRange?.to) {
             params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
         }
         if (terminal && terminal !== 'all') {
             params.append('terminalId', terminal);
         }

         const response = await fetch(`/api/sales/transactions?${params.toString()}`);
         const result = await response.json();
         if (result.success) {
             // Convert transaction data to Sale type compatibility
             const mappedSales = result.data.map((tx: any) => ({
                 id: tx.id, // Sale ID
                 posTransactionId: tx.posTransactionId,
                 customer: tx.customer,
                 invoiceDate: tx.date,
                 status: 'Voided',
                 total: tx.total,
                 paymentMethod: tx.paymentMethod,
                 items: [] 
             }));
             // Also filter for 'Failed' if desired or handled by API
             setSales(mappedSales);
         }
      } catch (error) {
         console.error("Error fetching voided sales:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVoidedSales();
  }, [dateRange, terminal]);

  const voidedSales = useMemo(() => {
    if (!searchTerm) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter((sale: Sale) => {
      const idMatch = sale.id.toLowerCase().includes(term);
      const customerMatch = sale.customer.name.toLowerCase().includes(term);
      return idMatch || customerMatch;
    });
  }, [sales, searchTerm]);

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setTerminal('all');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voided Sales</CardTitle>
        <CardDescription>
          A log of all sales transactions that were voided or failed.
        </CardDescription>
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
            {(searchTerm || dateRange || terminal !== 'all') && (
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
              <TableHead>Date</TableHead>
              <TableHead>Reason / Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {voidedSales.length > 0 ? (
              voidedSales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{sale.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{sale.customer.contactNumber}</div>
                  </TableCell>
                  <TableCell>{format(new Date((sale.invoiceDate || sale.date) as string), 'PP')}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">{sale.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ₱{sale.total.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No voided sales found for the selected criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

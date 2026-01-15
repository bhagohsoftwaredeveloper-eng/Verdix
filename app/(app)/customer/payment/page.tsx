
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import type { Customer, Sale } from '@/lib/types';
import { format, isPast, subDays, addDays, isWithinInterval } from 'date-fns';
import { RecordPaymentDialog } from './record-payment-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOCK_CUSTOMERS: Customer[] = [
    { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30' },
    { id: 'cust_2', name: 'Bob Smith', contactNumber: '09182223344', paymentTerms: 'Due on receipt' },
    { id: 'cust_3', name: 'Charlie Brown', contactNumber: '09193334455', paymentTerms: 'Net 15' },
];

const MOCK_SALES: Sale[] = [
    { 
        id: 'sale_1', 
        customer: MOCK_CUSTOMERS[0], 
        invoiceDate: subDays(new Date(), 40).toISOString(),
        dueDate: subDays(new Date(), 10).toISOString(),
        items: [], 
        total: 1250.00, 
        paymentMethod: '', 
        status: 'Pending'
    },
    { 
        id: 'sale_2', 
        customer: MOCK_CUSTOMERS[0], 
        invoiceDate: subDays(new Date(), 10).toISOString(),
        dueDate: addDays(new Date(), 20).toISOString(),
        items: [], 
        total: 800.50, 
        paymentMethod: '', 
        status: 'Pending' 
    },
    { 
        id: 'sale_3', 
        customer: MOCK_CUSTOMERS[1], 
        invoiceDate: subDays(new Date(), 5).toISOString(),
        dueDate: subDays(new Date(), 5).toISOString(),
        items: [], 
        total: 3500.00, 
        paymentMethod: '', 
        status: 'Pending' 
    },
    { 
        id: 'sale_4', 
        customer: MOCK_CUSTOMERS[0], 
        invoiceDate: subDays(new Date(), 60).toISOString(),
        dueDate: subDays(new Date(), 30).toISOString(),
        items: [], 
        total: 200.00, 
        paymentMethod: 'Cash', 
        status: 'Paid' // This should not appear
    },
];

function getStatusInfo(sale: Sale): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
    if (sale.status === 'Paid') {
      return { text: 'Paid', variant: 'default' };
    }
    const dueDate = sale.dueDate ? new Date(sale.dueDate) : new Date();
    if (isPast(dueDate)) {
        return { text: 'Overdue', variant: 'destructive' };
    }
    return { text: 'Pending', variant: 'secondary' };
}


function InvoiceRow({ sale }: { sale: Sale }) {
  const status = getStatusInfo(sale);

  return (
    <TableRow>
      <TableCell className="font-mono">{sale.id}</TableCell>
      <TableCell>{sale.customer.name}</TableCell>
      <TableCell>{format(new Date(sale.invoiceDate || sale.date || new Date()), 'PP')}</TableCell>
      <TableCell>{sale.dueDate ? format(new Date(sale.dueDate), 'PP') : 'N/A'}</TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.text}</Badge>
      </TableCell>
      <TableCell className="text-right">₱{sale.total.toFixed(2)}</TableCell>
      <TableCell className="text-right">
        <RecordPaymentDialog sale={sale} />
      </TableCell>
    </TableRow>
  );
}

function InvoiceSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-9 w-32 ml-auto" /></TableCell>
        </TableRow>
    )
}

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function CustomerPaymentPage() {
  const [searchCustomer, setSearchCustomer] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    // Simulate fetching invoices
    setIsLoadingInvoices(true);
    setTimeout(() => {
        let filteredInvoices = MOCK_SALES.filter(sale => sale.status === 'Pending');

        // Apply customer search filter if search is provided
        if (searchCustomer.trim()) {
            filteredInvoices = filteredInvoices.filter(sale =>
                sale.customer.name.toLowerCase().includes(searchCustomer.toLowerCase())
            );
        }

        // Apply date range filter if set
        if (dateRange.from && dateRange.to) {
            filteredInvoices = filteredInvoices.filter(sale => {
                const saleDate = new Date(sale.invoiceDate || sale.date || new Date());
                return isWithinInterval(saleDate, {
                    start: dateRange.from!,
                    end: dateRange.to!,
                });
            });
        }

        setInvoices(filteredInvoices);
        setIsLoadingInvoices(false);
    }, 500);
  }, [searchCustomer, dateRange]);

  const sortedInvoices = useMemo(() => {
    if (!invoices) return [];
    return [...invoices].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [invoices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Payments</CardTitle>
        <CardDescription>
          View all outstanding customer invoices. Use search and date filters to narrow results.
        </CardDescription>
        <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <div className="w-full max-w-sm">
                <Input
                    placeholder="Search customer..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                />
            </div>
            <div className="w-full max-w-sm">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateRange.from && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from ? (
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
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange.from}
                            selected={{
                                from: dateRange.from,
                                to: dateRange.to,
                            }}
                            onSelect={(range) => setDateRange({
                                from: range?.from,
                                to: range?.to,
                            })}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount Due</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingInvoices && Array.from({length: 3}).map((_, i) => <InvoiceSkeleton key={i} />)}
            {!isLoadingInvoices && sortedInvoices.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        {searchCustomer.trim() ? "No outstanding invoices found for the searched customer." : "No outstanding invoices found."}
                    </TableCell>
                </TableRow>
            )}
            {sortedInvoices.map((invoice) => (
              <InvoiceRow key={invoice.id} sale={invoice} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

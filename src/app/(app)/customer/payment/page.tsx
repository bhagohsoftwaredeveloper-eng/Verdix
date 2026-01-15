
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Customer, Sale } from '@/lib/types';
import { format, isPast, subDays, addDays } from 'date-fns';
import { RecordPaymentDialog } from './record-payment-dialog';
import { Skeleton } from '@/components/ui/skeleton';

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
      <TableCell className="font-mono">{sale.id.substring(0, 7)}...</TableCell>
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
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-9 w-32 ml-auto" /></TableCell>
        </TableRow>
    )
}

export default function CustomerPaymentPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  
  useEffect(() => {
    // Simulate fetching customers
    setIsLoadingCustomers(true);
    setTimeout(() => {
        setCustomers(MOCK_CUSTOMERS);
        setIsLoadingCustomers(false);
    }, 500);
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
        setInvoices([]);
        return;
    }
    // Simulate fetching invoices for the selected customer
    setIsLoadingInvoices(true);
    setTimeout(() => {
        const customerInvoices = MOCK_SALES.filter(
            sale => sale.customer.id === selectedCustomerId && sale.status === 'Pending'
        );
        setInvoices(customerInvoices);
        setIsLoadingInvoices(false);
    }, 500);
  }, [selectedCustomerId]);
  
  const sortedInvoices = useMemo(() => {
    if (!invoices) return [];
    return [...invoices].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  }, [invoices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Payments</CardTitle>
        <CardDescription>
          Select a customer to view their outstanding invoices and record payments.
        </CardDescription>
        <div className="pt-4 w-full max-w-sm">
            <Select onValueChange={setSelectedCustomerId} disabled={isLoadingCustomers}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a customer..." />
                </SelectTrigger>
                <SelectContent>
                    {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount Due</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingInvoices && Array.from({length: 3}).map((_, i) => <InvoiceSkeleton key={i} />)}
            {!selectedCustomerId && !isLoadingInvoices && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Please select a customer to see their invoices.
                    </TableCell>
                </TableRow>
            )}
             {selectedCustomerId && !isLoadingInvoices && sortedInvoices.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                       No outstanding invoices found for this customer.
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

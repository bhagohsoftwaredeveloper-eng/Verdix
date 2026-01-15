
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import type { Customer, Sale } from '@/lib/types';
import { subDays, addDays } from 'date-fns';


const MOCK_CUSTOMERS: Customer[] = [
    { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30' },
    { id: 'cust_2', name: 'Bob Smith', contactNumber: '09182223344', paymentTerms: 'Due on receipt' },
    { id: 'cust_3', name: 'Charlie Brown', contactNumber: '09193334455', paymentTerms: 'Net 15' },
    { id: 'cust_4', name: 'Diana Prince', contactNumber: '09204445566', paymentTerms: 'Net 30' },
    { id: 'cust_5', name: 'Ethan Hunt', contactNumber: '09215556677', paymentTerms: 'Net 60' },
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
        id: 'sale_5', 
        customer: MOCK_CUSTOMERS[3], 
        invoiceDate: subDays(new Date(), 2).toISOString(),
        dueDate: addDays(new Date(), 28).toISOString(),
        items: [], 
        total: 450.75, 
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

interface CustomerWithBalance extends Customer {
  balance: number;
  invoiceCount: number;
}

function CustomerRow({ customer }: { customer: CustomerWithBalance }) {
    const getInitials = (name: string) => {
        if (!name) return '??';
        const names = name.split(' ');
        return names.map(n => n[0]).join('').toUpperCase();
    }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-4">
            <Avatar>
                <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
            </Avatar>
            <div>
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-muted-foreground">{customer.contactNumber}</div>
            </div>
        </div>
      </TableCell>
      <TableCell className="text-center">{customer.invoiceCount}</TableCell>
      <TableCell className="text-right font-semibold">
        {customer.balance > 0 ? `₱${customer.balance.toFixed(2)}` : '-'}
      </TableCell>
    </TableRow>
  );
}

function CustomerSkeleton() {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24 mt-1" />
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-center"><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
        </TableRow>
    )
}

export default function CustomerBalancesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
        setCustomers(MOCK_CUSTOMERS);
        setSales(MOCK_SALES);
        setIsLoading(false);
    }, 500);
  }, []);

  const customersWithBalances = useMemo(() => {
    if (!customers || !sales) return [];

    const balancesMap = new Map<string, { balance: number; invoiceCount: number }>();

    sales.forEach(sale => {
      if (sale.status === 'Pending') {
        const customerId = sale.customer.id;
        const current = balancesMap.get(customerId) || { balance: 0, invoiceCount: 0 };
        current.balance += sale.total;
        current.invoiceCount += 1;
        balancesMap.set(customerId, current);
      }
    });

    return customers
      .map(customer => ({
        ...customer,
        balance: balancesMap.get(customer.id)?.balance || 0,
        invoiceCount: balancesMap.get(customer.id)?.invoiceCount || 0,
      }))
      .filter(c => c.balance > 0)
      .sort((a,b) => b.balance - a.balance);
      
  }, [customers, sales]);
  
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customersWithBalances;
    const term = searchTerm.toLowerCase();
    return customersWithBalances.filter(c => c.name.toLowerCase().includes(term) || c.contactNumber.includes(term));
  }, [customersWithBalances, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Balances</CardTitle>
        <CardDescription>
          A summary of outstanding balances for each customer.
        </CardDescription>
        <div className="pt-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by customer name or contact..."
                    className="pl-8 sm:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-center">Outstanding Invoices</TableHead>
              <TableHead className="text-right">Total Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({length: 4}).map((_, i) => <CustomerSkeleton key={i} />)}
            {!isLoading && filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} />
                ))
            ) : !isLoading && (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        No outstanding customer balances found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

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
import type { Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface CustomerWithBalance {
  id: string;
  name: string;
  contactNumber: string;
  paymentTerms?: string;
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
        {customer.balance > 0 ? `₱${Number(customer.balance).toFixed(2)}` : '-'}
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
  const [customersWithBalances, setCustomersWithBalances] = useState<CustomerWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomerBalances = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/customers/balances');
      const result = await response.json();
      
      if (result.success) {
        setCustomersWithBalances(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load customer balances',
        });
      }
    } catch (error) {
      console.error('Error fetching customer balances:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load customer balances',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerBalances();
  }, []);
  
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

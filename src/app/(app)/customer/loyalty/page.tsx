
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
import { subDays, format } from 'date-fns';
import { AdjustPointsDialog } from './adjust-points-dialog';


interface CustomerWithLoyalty extends Customer {
  loyaltyPoints: number;
  lastTransaction: string;
}

const MOCK_CUSTOMERS: CustomerWithLoyalty[] = [
    { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30', loyaltyPoints: 125, lastTransaction: subDays(new Date(), 2).toISOString() },
    { id: 'cust_2', name: 'Bob Smith', contactNumber: '09182223344', paymentTerms: 'Due on receipt', loyaltyPoints: 80, lastTransaction: subDays(new Date(), 10).toISOString() },
    { id: 'cust_3', name: 'Charlie Brown', contactNumber: '09193334455', paymentTerms: 'Net 15', loyaltyPoints: 500, lastTransaction: subDays(new Date(), 1).toISOString() },
    { id: 'cust_4', name: 'Diana Prince', contactNumber: '09204445566', paymentTerms: 'Net 30', loyaltyPoints: 0, lastTransaction: subDays(new Date(), 90).toISOString() },
    { id: 'cust_5', name: 'Ethan Hunt', contactNumber: '09215556677', paymentTerms: 'Net 60', loyaltyPoints: 230, lastTransaction: subDays(new Date(), 5).toISOString() },
];

function CustomerRow({ customer }: { customer: CustomerWithLoyalty }) {
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
      <TableCell className="text-center font-semibold text-lg text-primary">
        {customer.loyaltyPoints}
      </TableCell>
       <TableCell className="text-center hidden sm:table-cell">
        {format(new Date(customer.lastTransaction), 'PP')}
      </TableCell>
      <TableCell className="text-right">
        <AdjustPointsDialog customer={customer} />
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
            <TableCell className="text-center"><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
            <TableCell className="text-center hidden sm:table-cell"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-9 w-32 ml-auto" /></TableCell>
        </TableRow>
    )
}

export default function CustomerLoyaltyPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerWithLoyalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
        setCustomers(MOCK_CUSTOMERS);
        setIsLoading(false);
    }, 500);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(term) || c.contactNumber.includes(term));
  }, [customers, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Loyalty Points</CardTitle>
        <CardDescription>
          View and manage the loyalty points for each customer.
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
              <TableHead className="text-center">Points Balance</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Last Transaction</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
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
                    <TableCell colSpan={4} className="h-24 text-center">
                        No customers found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

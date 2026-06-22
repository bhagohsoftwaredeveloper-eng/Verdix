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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { useCustomerBalances, type CustomerWithBalance } from './use-customer-balances';

function CustomerRow({ customer }: { customer: CustomerWithBalance }) {
  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    return names.map(n => n[0]).join('').toUpperCase();
  };

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
        {customer.balance > 0 ? `₱${Number(customer.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
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
  );
}

export default function CustomerBalancesPage() {
  const { searchTerm, setSearchTerm, isLoading, filteredCustomers } = useCustomerBalances();

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

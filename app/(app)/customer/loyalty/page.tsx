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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { Customer } from '@/lib/types';
import { format } from 'date-fns';
import { AdjustPointsDialog } from './adjust-points-dialog';
import { LoyaltySettingsDialog } from './loyalty-settings-dialog';
import { AddLoyaltyCardDialog } from './add-loyalty-card-dialog';
import { PointsHistoryDialog } from './points-history-dialog';
import { EditLoyaltyCardDialog } from './edit-loyalty-card-dialog';
import { DeleteLoyaltyCardDialog } from './delete-loyalty-card-dialog';
import { Plus } from 'lucide-react';


interface CustomerWithLoyalty {
  id: string;
  customer_id: string;
  name: string;
  contact_number: string;
  payment_terms: string | null;
  rfid_code: string | null;
  expiry_date: string | null;
  point_setting: string | null;
  loyaltyPoints: number;
  last_transaction: string | null;
  created_at: string;
  updated_at: string;
}

function CustomerRow({ customer, onRefresh }: { customer: CustomerWithLoyalty; onRefresh: () => void }) {
    const getInitials = (name: string) => {
        if (!name) return '??';
        const names = name.split(' ');
        return names.map(n => n[0]).join('').toUpperCase();
    }

    // Map to the interface expected by AdjustPointsDialog
    const mappedCustomerForAdjust = {
      id: customer.customer_id,
      name: customer.name,
      contactNumber: customer.contact_number,
      paymentTerms: customer.payment_terms || '',
      loyaltyPoints: customer.loyaltyPoints
    };

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.customer_id}</TableCell>
      <TableCell>
        <div className="flex items-center gap-4">
            <Avatar>
                <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
            </Avatar>
            <div>
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-muted-foreground">{customer.contact_number}</div>
            </div>
        </div>
      </TableCell>
      <TableCell className="text-center font-semibold text-lg text-primary">
        {customer.loyaltyPoints}
      </TableCell>
      <TableCell className="text-center">{customer.point_setting || 'Not set'}</TableCell>
      <TableCell className="text-center">
        {customer.expiry_date ? format(new Date(customer.expiry_date), 'PP') : 'No expiry'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <EditLoyaltyCardDialog customer={customer} onSuccess={onRefresh} />
          <AdjustPointsDialog customer={mappedCustomerForAdjust} onFinished={onRefresh} />
          <PointsHistoryDialog customerLoyaltyId={customer.id} customerName={customer.name} />
          <DeleteLoyaltyCardDialog customer={customer} onSuccess={onRefresh} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function CustomerSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
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
            <TableCell className="text-center"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
            <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-9 w-32 ml-auto" /></TableCell>
        </TableRow>
    )
}

export default function CustomerLoyaltyPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerWithLoyalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Show 10 customers per page

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/customer-loyalty');
      if (response.ok) {
        const result = await response.json();
        setCustomers(result.data || []);
      } else {
        console.error('Failed to fetch customer loyalty data:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        const errorText = await response.text();
        console.error('Response body:', errorText);
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customer loyalty data:', error);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(term) || c.contact_number.includes(term));
  }, [customers, searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Loyalty Points</CardTitle>
        <CardDescription>
          View and manage the loyalty points for each customer.
        </CardDescription>
        <div className="pt-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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
            <div className="flex gap-2">
                <AddLoyaltyCardDialog showLabel={true} onSuccess={fetchCustomers} />
                <LoyaltySettingsDialog />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead className="text-center">Total Points</TableHead>
              <TableHead className="text-center">Point Setting</TableHead>
              <TableHead className="text-center">Expiry Date</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({length: 4}).map((_, i) => <CustomerSkeleton key={i} />)}
            {!isLoading && paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} onRefresh={fetchCustomers} />
                ))
            ) : !isLoading && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No customers found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current page
                    return page === 1 ||
                           page === totalPages ||
                           (page >= currentPage - 1 && page <= currentPage + 1);
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const prevPage = array[index - 1];
                    const showEllipsisBefore = index > 0 && page - prevPage > 1;

                    return (
                      <div key={page} className="flex items-center">
                        {showEllipsisBefore && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      </div>
                    );
                  })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from '@/components/ui/button';
import { Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddLoyaltyCardDialog } from '../../customer/loyalty/add-loyalty-card-dialog';
import EditCustomerDialog, { CustomerFormValues } from './edit-customer-dialog';

interface CustomerListProps {
  customers: Customer[];
  isLoading: boolean;
  onUpdateCustomer: (customerId: string, values: CustomerFormValues) => Promise<void>;
  onDeleteCustomer: (customerId: string) => Promise<void>;
}

function CustomerRow({ customer, onUpdate, onDelete }: { customer: Customer, onUpdate: (values: CustomerFormValues) => Promise<void>, onDelete: () => Promise<void> }) {
  const { toast } = useToast();

  const handleUpdate = async (values: CustomerFormValues) => {
    await onUpdate(values);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete the customer "${customer.name}"?`)) {
      try {
        await onDelete();
        toast({
          title: 'Customer Deleted',
          description: `Customer "${customer.name}" has been deleted.`,
        });
      } catch (error) {
        console.error("Error deleting customer: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete customer. Please try again.',
        });
      }
    }
  };

  // Convert customer to the format expected by AddLoyaltyCardDialog
  const customerWithLoyalty = {
    ...customer,
    loyaltyPoints: customer.loyaltyPoints || 0,
    lastTransaction: (customer as any).lastTransaction || '',
    expiryDate: (customer as any).expiryDate || '',
    pointSetting: (customer as any).pointSetting || '',
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell>{customer.contactNumber}</TableCell>
      <TableCell>{customer.paymentTerms}</TableCell>
      <TableCell>{customer.address}</TableCell>
      <TableCell>{customer.billingAddress}</TableCell>
      <TableCell>{customer.discount}%</TableCell>
      <TableCell>₱{Number(customer.creditLimit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <EditCustomerDialog customer={customer} onSave={handleUpdate}>
            <Button variant="outline" size="sm" title="Edit Customer">
              <Pencil className="h-4 w-4" />
            </Button>
          </EditCustomerDialog>
          <AddLoyaltyCardDialog customer={customerWithLoyalty} />
          <Button variant="destructive" size="sm" onClick={handleDelete} title="Delete Customer">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CustomerSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-40" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function CustomerList({ 
  customers = [], 
  isLoading, 
  onUpdateCustomer, 
  onDeleteCustomer,
  totalCount = 0,
  currentPage = 1,
  onPageChange
}: CustomerListProps & { 
  totalCount?: number, 
  currentPage?: number, 
  onPageChange?: (page: number) => void 
}) {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (onPageChange) onPageChange(page);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact No.</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Billing Address</TableHead>
              <TableHead>Discount (%)</TableHead>
              <TableHead>Credit Limit</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <CustomerSkeleton key={i} />)}
            {!isLoading && customers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onUpdate={(values) => onUpdateCustomer(customer.id, values)}
                onDelete={() => onDeleteCustomer(customer.id)}
              />
            ))}
            {!isLoading && customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && totalCount > itemsPerPage && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) handlePageChange(currentPage - 1);
                }}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              // Simple pagination logic: show first, last, and pages around current
              if (
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
                      }}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (
                (page === currentPage - 2 && page > 1) ||
                (page === currentPage + 2 && page < totalPages)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) handlePageChange(currentPage + 1);
                }}
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

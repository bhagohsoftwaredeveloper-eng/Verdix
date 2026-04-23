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
import { Pencil, Trash2, MoreHorizontal, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddLoyaltyCardDialog } from '../../customer/loyalty/add-loyalty-card-dialog';
import EditCustomerDialog, { CustomerFormValues } from './edit-customer-dialog';
import { getApiUrl } from '@/lib/api-config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CustomerListProps {
  customers: Customer[];
  isLoading: boolean;
  onUpdateCustomer: (customerId: string, values: CustomerFormValues) => Promise<void>;
  onDeleteCustomer: (customerId: string) => Promise<void>;
}

function CustomerRow({ 
  customer, 
  onEditSelected,
  onDeleteSelected,
  onLoyaltySelected,
}: { 
  customer: Customer, 
  onEditSelected: () => void,
  onDeleteSelected: () => void,
  onLoyaltySelected: () => void,
}) {
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
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEditSelected}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Customer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLoyaltySelected}>
                <CreditCard className="mr-2 h-4 w-4" />
                Add Loyalty Card
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={onDeleteSelected}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
  onPageChange,
  itemsPerPage = 10,
  onItemsPerPageChange
}: CustomerListProps & { 
  totalCount?: number, 
  currentPage?: number, 
  onPageChange?: (page: number) => void,
  itemsPerPage?: number,
  onItemsPerPageChange?: (limit: number) => void
}) {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);
  const [isLoyaltyDialogOpen, setIsLoyaltyDialogOpen] = useState(false);
  
  const [isCheckingTransactions, setIsCheckingTransactions] = useState(false);
  const [hasTransactions, setHasTransactions] = useState(false);
  const [transactionTypes, setTransactionTypes] = useState<string[]>([]);
  const { toast } = useToast();

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (onPageChange) onPageChange(page);
  };

  const checkTransactions = async (customer: Customer) => {
    try {
      setIsCheckingTransactions(true);
      const response = await fetch(getApiUrl(`/customers/${customer.id}/check-transactions`));
      const result = await response.json();
      if (result.success) {
        setHasTransactions(result.hasTransactions);
        setTransactionTypes(result.transactionTypes || []);
      }
    } catch (error) {
      console.error('Error checking transactions:', error);
    } finally {
      setIsCheckingTransactions(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await onDeleteCustomer(deletingCustomer.id);
      toast({
        title: 'Customer Deleted',
        description: `Customer "${deletingCustomer.name}" has been deleted.`,
      });
      setIsDeleteDialogOpen(false);
      setDeletingCustomer(null);
    } catch (error: any) {
      console.error("Error deleting customer: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete customer. Please try again.',
      });
    }
  };

  // Convert customer to the format expected by AddLoyaltyCardDialog
  const customerWithLoyalty = loyaltyCustomer ? {
    ...loyaltyCustomer,
    loyaltyPoints: loyaltyCustomer.loyaltyPoints || 0,
    lastTransaction: (loyaltyCustomer as any).lastTransaction || '',
    expiryDate: (loyaltyCustomer as any).expiryDate || '',
    pointSetting: (loyaltyCustomer as any).pointSetting || '',
  } : undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table wrapperClassName="h-[500px] relative">
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
                onEditSelected={() => {
                  setEditingCustomer(customer);
                  setIsEditDialogOpen(true);
                }}
                onLoyaltySelected={() => {
                  setLoyaltyCustomer(customer);
                  setIsLoyaltyDialogOpen(true);
                }}
                onDeleteSelected={() => {
                  setDeletingCustomer(customer);
                  setIsDeleteDialogOpen(true);
                  checkTransactions(customer);
                }}
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

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              if (onItemsPerPageChange) onItemsPerPageChange(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={itemsPerPage.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isLoading && totalCount > itemsPerPage && (
          <Pagination className="w-auto ml-auto mr-0">
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

      {/* Edit Customer Dialog */}
      {editingCustomer && (
        <EditCustomerDialog
          customer={editingCustomer}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={(values) => onUpdateCustomer(editingCustomer.id, values)}
        />
      )}

      {/* Add Loyalty Card Dialog */}
      {loyaltyCustomer && (
        <AddLoyaltyCardDialog
          customer={customerWithLoyalty as any}
          open={isLoyaltyDialogOpen}
          onOpenChange={setIsLoyaltyDialogOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasTransactions ? "Deletion Blocked" : "Are you absolutely sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCheckingTransactions ? (
                "Checking for existing transactions..."
              ) : hasTransactions ? (
                <>
                  This customer cannot be deleted because they have records in: <b>{transactionTypes.join(", ")}</b>. 
                  Please settle or remove these records first.
                </>
              ) : (
                `This action cannot be undone. This will permanently delete the customer "${deletingCustomer?.name}" and remove their data from our servers.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCustomer(null)}>Cancel</AlertDialogCancel>
            {!hasTransactions && !isCheckingTransactions && (
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

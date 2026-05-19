'use client';

import { useState, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  PaginationState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pencil, Trash2, MoreHorizontal, CreditCard,
  ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CustomerListProps {
  customers: Customer[];
  isLoading: boolean;
  onUpdateCustomer: (customerId: string, values: CustomerFormValues) => Promise<void>;
  onDeleteCustomer: (customerId: string) => Promise<void>;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (limit: number) => void;
}

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (isSorted === 'asc') return <ArrowUp className="ml-1 h-3.5 w-3.5" />;
  if (isSorted === 'desc') return <ArrowDown className="ml-1 h-3.5 w-3.5" />;
  return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
}

function CustomerSkeleton({ colCount }: { colCount: number }) {
  return (
    <TableRow>
      {Array.from({ length: colCount }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-5 w-full" />
        </TableCell>
      ))}
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
  onItemsPerPageChange,
}: CustomerListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
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
      console.error('Error deleting customer: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete customer. Please try again.',
      });
    }
  };

  const customerWithLoyalty = loyaltyCustomer
    ? {
        ...loyaltyCustomer,
        loyaltyPoints: loyaltyCustomer.loyaltyPoints || 0,
        lastTransaction: (loyaltyCustomer as any).lastTransaction || '',
        expiryDate: (loyaltyCustomer as any).expiryDate || '',
        pointSetting: (loyaltyCustomer as any).pointSetting || '',
      }
    : undefined;

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <SortIcon isSorted={column.getIsSorted()} />
        </Button>
      ),
      cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'contactNumber',
      header: 'Contact No.',
      cell: ({ getValue }) => getValue<string>() || '-',
    },
    {
      accessorKey: 'paymentTerms',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Payment Terms
          <SortIcon isSorted={column.getIsSorted()} />
        </Button>
      ),
      cell: ({ getValue }) => getValue<string>() || '-',
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ getValue }) => getValue<string>() || '-',
    },
    {
      accessorKey: 'billingAddress',
      header: 'Billing Address',
      cell: ({ getValue }) => getValue<string>() || '-',
    },
    {
      accessorKey: 'discount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Discount (%)
          <SortIcon isSorted={column.getIsSorted()} />
        </Button>
      ),
      cell: ({ getValue }) => `${getValue<number>()}%`,
    },
    {
      accessorKey: 'creditLimit',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Credit Limit
          <SortIcon isSorted={column.getIsSorted()} />
        </Button>
      ),
      cell: ({ getValue }) =>
        `₱${Number(getValue<number>() || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const customer = row.original;
        return (
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
                <DropdownMenuItem
                  onClick={() => {
                    setEditingCustomer(customer);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Customer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setLoyaltyCustomer(customer);
                    setIsLoyaltyDialogOpen(true);
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Add Loyalty Card
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setDeletingCustomer(customer);
                    setIsDeleteDialogOpen(true);
                    checkTransactions(customer);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], []);

  const pageCount = Math.ceil(totalCount / itemsPerPage);

  const table = useReactTable({
    data: customers,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: itemsPerPage,
      },
    },
    pageCount,
    manualPagination: true,
    manualFiltering: true,
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: currentPage - 1, pageSize: itemsPerPage })
          : updater;
      if (next.pageIndex !== currentPage - 1 && onPageChange) {
        onPageChange(next.pageIndex + 1);
      }
      if (next.pageSize !== itemsPerPage && onItemsPerPageChange) {
        onItemsPerPageChange(next.pageSize);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const startEntry = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table wrapperClassName="h-[500px] relative">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <CustomerSkeleton key={i} colCount={columns.length} />
              ))}
            {!isLoading && table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center h-24">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isLoading && totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              Showing {startEntry}–{endEntry} of {totalCount}
            </span>
          )}
        </div>

        {!isLoading && totalCount > itemsPerPage && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
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
              {hasTransactions ? 'Deletion Blocked' : 'Are you absolutely sure?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCheckingTransactions ? (
                'Checking for existing transactions...'
              ) : hasTransactions ? (
                <>
                  This customer cannot be deleted because they have records in:{' '}
                  <b>{transactionTypes.join(', ')}</b>. Please settle or remove these records first.
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

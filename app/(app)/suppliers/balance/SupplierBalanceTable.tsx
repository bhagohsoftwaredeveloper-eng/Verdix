'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Search, MoreHorizontal, Eye, CreditCard, X } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { SupplierWithBalance, SupplierFilters } from '../actions';
import { BalanceFilterDialog } from './balance-filter/BalanceFilterDialog';

type Props = {
  suppliers: SupplierWithBalance[];
  paginatedSuppliers: SupplierWithBalance[];
  loading: boolean;
  searchTerm: string;
  filters: SupplierFilters;
  currentPage: number;
  pageSize: number;
  onSearchChange: (v: string) => void;
  onFilterChange: (f: SupplierFilters) => void;
  onResetFilters: () => void;
  setCurrentPage: (p: number) => void;
  setPageSize: (s: number) => void;
  onViewTransactions: (supplier: SupplierWithBalance) => void;
  onMakePayment: (supplier: SupplierWithBalance) => void;
};

export function SupplierBalanceTable({
  suppliers, paginatedSuppliers, loading,
  searchTerm, filters,
  currentPage, pageSize,
  onSearchChange, onFilterChange, onResetFilters,
  setCurrentPage, setPageSize,
  onViewTransactions, onMakePayment,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Balances</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                className="pl-8"
                value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <BalanceFilterDialog filters={filters} onFilterChange={onFilterChange} onReset={onResetFilters} />
              {Object.keys(filters).length > 0 && (
                <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground" onClick={onResetFilters}>
                  Clear <X className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table wrapperClassName="max-h-[calc(100vh-350px)] overflow-auto relative">
          <TableHeader className="sticky top-0 z-30 bg-background shadow-sm">
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="font-semibold text-foreground">Supplier</TableHead>
              <TableHead className="font-semibold text-foreground">Oldest Invoice</TableHead>
              <TableHead className="font-semibold text-foreground">Total Purchases</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Current Balance</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">Loading...</TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No suppliers found.</TableCell>
              </TableRow>
            ) : paginatedSuppliers.map(supplier => {
              const daysOld = supplier.oldestInvoiceDate
                ? differenceInDays(new Date(), new Date(supplier.oldestInvoiceDate))
                : null;
              return (
                <TableRow key={supplier.id} className="group hover:bg-muted/50">
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    {supplier.oldestInvoiceDate ? (
                      <div className="flex flex-col">
                        <span className="text-xs">{format(new Date(supplier.oldestInvoiceDate), 'MMM dd, yyyy')}</span>
                        <span className={`text-[10px] ${daysOld! >= 30 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                          {daysOld} days ago
                        </span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>₱{supplier.totalPurchases.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-bold ${supplier.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ₱{supplier.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewTransactions(supplier)}>
                          <Eye className="mr-2 h-4 w-4" />View Transactions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMakePayment(supplier)}>
                          <CreditCard className="mr-2 h-4 w-4" />Make Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {suppliers.length > 0 && (
          <div className="py-2 border-t px-4">
            <DataTablePagination
              currentPage={currentPage}
              totalPages={Math.ceil(suppliers.length / pageSize)}
              pageSize={pageSize}
              totalItems={suppliers.length}
              setPage={setCurrentPage}
              setPageSize={setPageSize}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

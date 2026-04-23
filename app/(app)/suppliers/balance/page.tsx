'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Wallet, Clock, AlertTriangle, Calendar, MoreHorizontal, Eye, CreditCard, X } from 'lucide-react';
import { getSuppliersWithBalance, SupplierWithBalance, SupplierFilters } from '../actions';
import { MakePaymentDialog } from '../payment-dialog';
import { SupplierTransactionDialog } from './supplier-transaction-dialog';
import { BalanceFilterDialog } from './balance-filter-dialog';
import { differenceInDays, format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

export default function SupplierBalancePage() {
  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SupplierFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Dialog states
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithBalance | null>(null);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await getSuppliersWithBalance(searchTerm, filters);
      // Optional: Filter to only show suppliers with non-zero balance if desired?
      // For now, show all but sort by balance descending maybe?
      setSuppliers(data.sort((a, b) => b.balance - a.balance));
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadSuppliers();
  }, [searchTerm, filters]);

  const paginatedSuppliers = suppliers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPayable = suppliers.reduce((acc, s) => acc + s.balance, 0);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Balance to Supplier</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                 ₱{totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                 Total outstanding debt
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue (30+ Days)</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                 ₱{suppliers
                   .filter(s => s.oldestInvoiceDate && differenceInDays(new Date(), new Date(s.oldestInvoiceDate)) >= 30)
                   .reduce((acc, s) => acc + s.balance, 0)
                   .toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                 Critical outstanding balance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting Payment</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                 {suppliers.filter(s => s.balance > 0).length}
              </div>
              <p className="text-xs text-muted-foreground">
                 Suppliers with balance
              </p>
            </CardContent>
          </Card>
      </div>

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
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <BalanceFilterDialog 
                    filters={filters}
                    onFilterChange={setFilters}
                    onReset={() => setFilters({})}
                  />
                  {Object.keys(filters).length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 px-2 text-muted-foreground"
                      onClick={() => setFilters({})}
                    >
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
                   <TableCell colSpan={5} className="text-center py-10">
                     Loading...
                   </TableCell>
                 </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No suppliers found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="group hover:bg-muted/50">
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                       {supplier.oldestInvoiceDate ? (
                         <div className="flex flex-col">
                            <span className="text-xs">{format(new Date(supplier.oldestInvoiceDate), 'MMM dd, yyyy')}</span>
                            <span className={`text-[10px] ${differenceInDays(new Date(), new Date(supplier.oldestInvoiceDate)) >= 30 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                               {differenceInDays(new Date(), new Date(supplier.oldestInvoiceDate))} days ago
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
                           <DropdownMenuItem onClick={() => {
                               setSelectedSupplier(supplier);
                               setIsTransactionDialogOpen(true);
                           }}>
                             <Eye className="mr-2 h-4 w-4" />
                             View Transactions
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => {
                               setSelectedSupplier(supplier);
                               setIsPaymentDialogOpen(true);
                           }}>
                             <CreditCard className="mr-2 h-4 w-4" />
                             Make Payment
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
      {/* Dialogs */}
      {selectedSupplier && (
        <>
          <SupplierTransactionDialog
            supplierId={selectedSupplier.id}
            supplierName={selectedSupplier.name}
            open={isTransactionDialogOpen}
            onOpenChange={setIsTransactionDialogOpen}
          />
          <MakePaymentDialog
            supplier={selectedSupplier}
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            onPaymentComplete={loadSuppliers}
          />
        </>
      )}
    </div>
  );
}

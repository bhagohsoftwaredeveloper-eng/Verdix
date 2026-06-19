'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from '@tanstack/react-table';
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
import {
  Search, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  MoreHorizontal, Filter, X, Download, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { getSuppliersWithBalance, SupplierWithBalance, SupplierFilters } from '../actions';
import { addSupplier, updateSupplier, deleteSupplier } from '../../products/actions';
import { MakePaymentDialog } from '../payment-dialog';
import { SupplierFormDialog } from '../../products/suppliers/ManageSuppliersDialog';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/client-activity-logger';
import { useBusinessProfile } from '@/hooks/use-api';
import { exportToCSV, exportToPDF } from '../supplier-export-utils';
import { getApiUrl } from '@/lib/api-config';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (isSorted === 'asc') return <ArrowUp className="ml-1 h-3.5 w-3.5" />;
  if (isSorted === 'desc') return <ArrowDown className="ml-1 h-3.5 w-3.5" />;
  return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
}

export default function SuppliersListPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SupplierFilters>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();
  const { profile } = useBusinessProfile();
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithBalance | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierWithBalance | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await getSuppliersWithBalance(searchTerm, filters);
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load suppliers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [searchTerm, filters]);

  const handleAddSupplier = async (data: any) => {
    const result = await addSupplier(data);
    if (result.success) {
      await logActivity({
        action: 'CREATE',
        module: 'SUPPLIERS',
        description: `Added supplier: ${data.name} (${data.id})`,
        referenceId: data.id,
      });
      toast({ title: 'Success', description: result.message });
      loadSuppliers();
    } else {
      throw new Error(result.message);
    }
  };

  const handleUpdateSupplier = async (id: string, data: any) => {
    const result = await updateSupplier(id, data);
    if (result.success) {
      await logActivity({
        action: 'UPDATE',
        module: 'SUPPLIERS',
        description: `Updated supplier: ${data.name || id} (${id})`,
        referenceId: id,
      });
      toast({ title: 'Success', description: result.message });
      loadSuppliers();
    } else {
      throw new Error(result.message);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const result = await deleteSupplier(id);
      if (result.success) {
        await logActivity({
          action: 'DELETE',
          module: 'SUPPLIERS',
          description: `Deleted supplier ID: ${id}`,
          referenceId: id,
        });
        toast({ title: 'Success', description: result.message });
        loadSuppliers();
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the supplier.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.paymentTerms) params.append('paymentTerms', filters.paymentTerms);
      if (filters.orderSchedule) params.append('orderSchedule', filters.orderSchedule);
      if (filters.company) params.append('company', filters.company);
      if (filters.hasBalance) params.append('hasBalance', 'true');

      const response = await fetch(getApiUrl(`/suppliers/export?${params.toString()}`));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Export failed');

      const fileName = `suppliers_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') {
        await exportToCSV(result.data, fileName);
      } else {
        await exportToPDF(result.data, fileName, profile);
      }

      toast({ title: 'Export Successful', description: `Your ${format.toUpperCase()} file has been generated.` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Export Failed', description: 'An error occurred during export.', variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<SupplierWithBalance>[]>(() => [
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
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.email || '-'}</span>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      accessorFn: (row) => row.contactNumber || row.mobilePhone || row.telephone || '',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{row.original.contactNumber || row.original.mobilePhone || row.original.telephone || '-'}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.address}</span>
        </div>
      ),
    },
    {
      accessorKey: 'orderSchedule',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Schedule
          <SortIcon isSorted={column.getIsSorted()} />
        </Button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<string | null>();
        return val ? (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            {val}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      },
    },
    {
      accessorKey: 'company',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Company
          <SortIcon isSorted={column.getIsSorted()} />
        </Button>
      ),
      cell: ({ getValue }) => getValue<string>() || '-',
    },
    {
      accessorKey: 'tin',
      header: 'TIN',
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
      cell: ({ getValue }) => {
        const val = getValue<string | null>();
        return val ? (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
            {val}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      enableSorting: false,
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setEditingSupplier(supplier);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Supplier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDeletingSupplier(supplier);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Supplier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: suppliers,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const startIndex = pageIndex * pageSize + 1;
  const endIndex = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Supplier List</h2>
          <p className="text-muted-foreground">Manage your suppliers and their details.</p>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <SupplierFormDialog onSave={handleAddSupplier}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Supplier
            </Button>
          </SupplierFormDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Suppliers</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  className="pl-8"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                    {Object.keys(filters).length > 0 && (
                      <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                        {Object.keys(filters).length}
                      </span>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-[425px]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Filter Suppliers</AlertDialogTitle>
                    <AlertDialogDescription>
                      Narrow down your supplier list by applying filters.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select
                        value={filters.paymentTerms || 'all'}
                        onValueChange={(value) =>
                          setFilters((prev) => ({ ...prev, paymentTerms: value === 'all' ? undefined : value }))
                        }
                      >
                        <SelectTrigger id="paymentTerms">
                          <SelectValue placeholder="All Terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Terms</SelectItem>
                          <SelectItem value="COD">COD</SelectItem>
                          <SelectItem value="Net 7">Net 7</SelectItem>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 45">Net 45</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="orderSchedule">Order Schedule</Label>
                      <Input
                        id="orderSchedule"
                        placeholder="e.g. Monday"
                        value={filters.orderSchedule || ''}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, orderSchedule: e.target.value || undefined }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        placeholder="Search company..."
                        value={filters.company || ''}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, company: e.target.value || undefined }))
                        }
                      />
                    </div>
                    <div className="flex items-center space-x-2 py-2">
                      <input
                        type="checkbox"
                        id="hasBalance"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={filters.hasBalance || false}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, hasBalance: e.target.checked || undefined }))
                        }
                      />
                      <Label
                        htmlFor="hasBalance"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Show only suppliers with outstanding balance
                      </Label>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <Button variant="ghost" onClick={() => setFilters({})} className="mr-auto">
                      Reset
                    </Button>
                    <AlertDialogAction>Apply Filters</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
        </CardHeader>
        <CardContent>
          <div className="relative overflow-auto max-h-[calc(100vh-340px)] border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="bg-background">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-10">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                      No suppliers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalRows > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex} to {endIndex} of {totalRows} entries
              </span>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50, 100].map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium">
                      Page {pageIndex + 1} of {table.getPageCount()}
                    </span>
                  </div>

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
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Supplier Dialog */}
      <SupplierFormDialog
        supplier={editingSupplier as any}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={(data) => handleUpdateSupplier(editingSupplier!.id, data)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the supplier
              <span className="font-medium text-foreground"> {deletingSupplier?.name} </span>
              and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingSupplier(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingSupplier) {
                  handleDeleteSupplier(deletingSupplier.id);
                  setDeletingSupplier(null);
                  setIsDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

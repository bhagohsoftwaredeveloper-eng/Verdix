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
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Filter, X, Download, ChevronDown } from 'lucide-react';
import { getSuppliersWithBalance, SupplierWithBalance, SupplierFilters } from '../actions';
import { addSupplier, updateSupplier, deleteSupplier } from '../../products/actions';
import { MakePaymentDialog } from '../payment-dialog';
import { SupplierFormDialog } from '../../products/ManageSuppliersDialog';
import { useToast } from '@/hooks/use-toast';
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

export default function SuppliersListPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SupplierFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const { profile } = useBusinessProfile();

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
      toast({
        title: 'Success',
        description: result.message,
      });
      loadSuppliers();
    } else {
        throw new Error(result.message);
    }
  };

    const handleUpdateSupplier = async (id: string, data: any) => {
    const result = await updateSupplier(id, data);
    if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        loadSuppliers();
    } else {
         throw new Error(result.message);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const result = await deleteSupplier(id);
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        loadSuppliers();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
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
      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Export failed');

      const fileName = `suppliers_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') {
        await exportToCSV(result.data, fileName);
      } else {
        await exportToPDF(result.data, fileName, profile);
      }

      toast({ title: "Export Successful", description: `Your ${format.toUpperCase()} file has been generated.` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "An error occurred during export.", variant: "destructive" });
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(suppliers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSuppliers = suppliers.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  Export as PDF
                </DropdownMenuItem>
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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                          value={filters.paymentTerms || "all"}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, paymentTerms: value === "all" ? undefined : value }))}
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
                          value={filters.orderSchedule || ""}
                          onChange={(e) => setFilters(prev => ({ ...prev, orderSchedule: e.target.value || undefined }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          placeholder="Search company..."
                          value={filters.company || ""}
                          onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value || undefined }))}
                        />
                      </div>
                      <div className="flex items-center space-x-2 py-2">
                        <input
                          type="checkbox"
                          id="hasBalance"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={filters.hasBalance || false}
                          onChange={(e) => setFilters(prev => ({ ...prev, hasBalance: e.target.checked || undefined }))}
                        />
                        <Label htmlFor="hasBalance" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Show only suppliers with outstanding balance
                        </Label>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setFilters({})}
                        className="mr-auto"
                      >
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
                <TableRow>
                  <TableHead className="min-w-[250px] bg-background">Name</TableHead>
                  <TableHead className="bg-background">Contact</TableHead>
                  <TableHead className="bg-background">Schedule</TableHead>
                  <TableHead className="bg-background">Company</TableHead>
                  <TableHead className="bg-background">TIN</TableHead>
                  <TableHead className="bg-background">Payment Terms</TableHead>
                  <TableHead className="text-right bg-background">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                   <TableCell colSpan={7} className="text-center py-10">
                     Loading...
                   </TableCell>
                 </TableRow>
              ) : paginatedSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No suppliers found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{supplier.name}</span>
                            <span className="text-xs text-muted-foreground">{supplier.email || '-'}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{supplier.contactNumber || supplier.mobilePhone || supplier.telephone || '-'}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{supplier.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                         {supplier.orderSchedule ? (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {supplier.orderSchedule}
                            </span>
                         ) : (
                             <span className="text-muted-foreground text-xs">-</span>
                         )}
                    </TableCell>
                    <TableCell>{supplier.company || '-'}</TableCell>
                    <TableCell>{supplier.tin || '-'}</TableCell>
                    <TableCell>
                        {supplier.paymentTerms ? (
                             <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                {supplier.paymentTerms}
                             </span>
                        ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                        )}
                    </TableCell>
                    {/* Removed Markup Column Cell */}
                    <TableCell className="text-right">
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
                          <SupplierFormDialog 
                              supplier={supplier as any}
                              onSave={(data) => handleUpdateSupplier(supplier.id, data)}
                          >
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Supplier
                              </DropdownMenuItem>
                          </SupplierFormDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Supplier
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the supplier
                                  <span className="font-medium text-foreground"> {supplier.name} </span>
                                  and remove their data from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSupplier(supplier.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

          {/* Pagination Controls */}
          {suppliers.length > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center gap-2">
                 <span className="text-sm text-muted-foreground">
                   Showing {startIndex + 1} to {Math.min(endIndex, suppliers.length)} of {suppliers.length} entries
                 </span>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

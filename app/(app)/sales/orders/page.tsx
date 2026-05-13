
'use client';

import { useState, useMemo } from 'react';
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Sale, SalesPerson, Customer } from '@/lib/types';
import { AddSalesOrderDialog } from './add-sales-order-dialog';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Printer,
  Filter,
  X,
  Search,
  MoreHorizontal,
  FileText,
  Truck,
  Edit,
  Ban,
  ClipboardList,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { Logo } from '@/components/logo';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatQuantity } from '@/lib/utils';
import { OrderDetailsDialog, OrderDialogMode } from './order-details-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ALL_STATUSES: Sale['status'][] = ['Pending', 'To Deliver', 'Fully Delivered', 'Paid', 'Shipped', 'Delivered', 'Returned', 'Failed'];

function getStatusVariant(status: string) {
  switch (status) {
    case 'Paid':
    case 'Fully Delivered': return 'default';
    case 'Pending':
    case 'To Deliver': return 'secondary';
    case 'Failed':
    case 'Returned': return 'destructive';
    case 'Shipped':
    case 'Delivered': return 'outline';
    default: return 'secondary';
  }
}

function SalesOrderPrintView({ order, onBack }: { order: Sale; onBack: () => void }) {
  const displayDate = order.invoiceDate || order.date;
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="icon" onClick={onBack} className="non-printable"><ArrowLeft className="h-4 w-4" /></Button>
              <CardTitle>Sales Order</CardTitle>
            </div>
            <CardDescription>Order ID: {order.id}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Logo className="size-7 text-primary" />
            <h1 className="text-xl font-semibold font-headline text-primary">StockPilot</h1>
          </div>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground pt-4">
          <div><p className="font-semibold text-foreground">Customer:</p><p>{order.customer.name}</p><p>{order.customer.contactNumber}</p></div>
          <div><p className="font-semibold text-foreground">Order Date:</p><p>{displayDate ? format(new Date(displayDate), 'PPP') : 'N/A'}</p></div>
          <div><p className="font-semibold text-foreground">Status:</p><p>{order.status}</p></div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price per Item</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map(item => (
              <TableRow key={item.product.id}>
                <TableCell>{item.product.name}</TableCell>
                <TableCell>{item.product.sku}</TableCell>
                <TableCell className="text-right">{formatQuantity(item.quantity)}</TableCell>
                <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 border-primary">
              <TableCell colSpan={4} className="text-right font-bold text-lg">Total</TableCell>
              <TableCell className="text-right font-bold text-lg">₱{order.total.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="mt-12">
        <div className="w-full grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-2"><div className="border-b border-foreground w-full"></div><p className="text-center">Signature over Printed Name</p></div>
          <div className="space-y-2"><div className="border-b border-foreground w-full"></div><p className="text-center">Date Received</p></div>
          <div className="col-span-2 text-center text-xs text-muted-foreground pt-4">Received the above goods in good order and condition.</div>
        </div>
      </CardFooter>
      <div className="flex justify-end mt-4 p-6 pt-0 non-printable">
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print Order</Button>
      </div>
    </Card>
  );
}

export default function SalesOrdersPage() {
  const [orderToPrint, setOrderToPrint] = useState<Sale | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [orderDialogMode, setOrderDialogMode] = useState<OrderDialogMode>('order');
  const [orderToEdit, setOrderToEdit] = useState<Sale | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '', startDate: '', endDate: '', salesPersonId: '', salesArea: '', customerId: '', reference: '',
  });
  const [dialogOpen, setDialogOpen] = useState({ status: false, date: false, salesPerson: false, salesArea: false, customer: false, reference: false });

  const { data: ordersResult, isLoading, refetch } = useQuery({
    queryKey: ['salesOrders', currentPage, limit, filters, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({ page: currentPage.toString(), limit: limit.toString(), ...filters, ...(searchTerm ? { search: searchTerm } : {}) });
      Array.from(params.keys()).forEach(key => { if (!params.get(key)) params.delete(key); });
      const res = await fetch(getApiUrl(`/sales/orders?${params.toString()}`));
      const data = await res.json();
      if (!data.success) throw new Error('Failed to fetch sales orders');
      return data;
    },
    placeholderData: (prev) => prev,
  });

  const sales: Sale[] = ordersResult?.data || [];
  const summary = ordersResult?.summary || { totalCount: 0, totalAmount: 0 };
  if (ordersResult?.pagination?.totalPages !== totalPages) {
    setTotalPages(ordersResult?.pagination?.totalPages ?? 1);
  }

  const { data: salesPersons = [] } = useQuery<SalesPerson[]>({
    queryKey: ['salesPersonsForOrders'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/sales-persons?activeOnly=true'));
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customersForOrders'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/customers'));
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(getApiUrl(`/sales/orders/${id}`), { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete order');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Order Deleted', description: 'The sales order has been deleted and stock returned to inventory.' });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const makeDeliveryMutation = useMutation({
    mutationFn: async (sale: Sale) => {
      const res = await fetch(getApiUrl(`/sales/orders/${sale.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sale, status: 'Fully Delivered' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update status');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Order Delivered', description: 'Status updated to Fully Delivered.' });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handlePrint = (order: Sale) => { setOrderToPrint(order); setOrderDialogMode('order'); setIsOrderDetailsOpen(true); };
  const handleDeliveryNote = (sale: Sale) => { setOrderToPrint(sale); setOrderDialogMode('delivery-note'); setIsOrderDetailsOpen(true); };
  const handleMakeInvoice = (sale: Sale) => { toast({ title: 'Make Invoice', description: `Creating invoice for order ${sale.reference || sale.id}` }); };
  const clearFilters = () => { setFilters({ status: '', startDate: '', endDate: '', salesPersonId: '', salesArea: '', customerId: '', reference: '' }); };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const columns = useMemo<ColumnDef<Sale>[]>(() => [
    {
      accessorKey: 'salesPerson',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Sales Person
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-60" />}
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium text-xs text-muted-foreground">{row.original.salesPerson || 'N/A'}</span>,
    },
    {
      id: 'customer',
      accessorFn: (row) => row.customer?.name,
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Customer
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-60" />}
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.customer.name}</span>,
    },
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) => <span className="text-xs">{row.original.reference || '-'}</span>,
    },
    {
      id: 'orderDate',
      accessorFn: (row) => row.orderDate || row.date,
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Order Date
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-60" />}
        </Button>
      ),
      cell: ({ row }) => {
        const d = row.original.orderDate || row.original.date;
        return d ? format(new Date(d), 'PP') : 'N/A';
      },
    },
    {
      accessorKey: 'deliveryDate',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Delivery Date
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-60" />}
        </Button>
      ),
      cell: ({ row }) => {
        const d = row.original.deliveryDate;
        return d ? format(new Date(d), 'PP') : '-';
      },
    },
    {
      accessorKey: 'total',
      header: ({ column }) => (
        <div className="text-right">
          <Button variant="ghost" size="sm" className="-mr-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Total
            {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-60" />}
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">{row.original.formattedTotal || `₱${row.original.total.toFixed(2)}`}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <div className="text-center">
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Status
            {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-60" />}
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant={getStatusVariant(row.original.status) as any} className="my-[-4px] mx-[-8px] py-1">
            {row.original.status}
          </Badge>
        </div>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      header: () => <div className="text-right non-printable"></div>,
      cell: ({ row }) => {
        const sale = row.original;
        const isFullyDelivered = sale.status === 'Fully Delivered';
        return (
          <div className="text-right non-printable">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handlePrint(sale)}><FileText className="mr-2 h-4 w-4" /> Order Detail</DropdownMenuItem>
                {isFullyDelivered && (
                  <>
                    <DropdownMenuItem onClick={() => handleDeliveryNote(sale)}><ClipboardList className="mr-2 h-4 w-4" /> Delivery Note</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMakeInvoice(sale)}><Receipt className="mr-2 h-4 w-4" /> Make Invoice</DropdownMenuItem>
                  </>
                )}
                {['Pending', 'Paid', 'Shipped', 'To Deliver'].includes(sale.status) && (
                  <DropdownMenuItem onClick={() => makeDeliveryMutation.mutate(sale)}><Truck className="mr-2 h-4 w-4" /> Make Delivery</DropdownMenuItem>
                )}
                {!isFullyDelivered && (
                  <>
                    <DropdownMenuItem onClick={() => { setOrderToEdit(sale); setIsEditOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Edit Order</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setOrderToDelete(sale.id)}><Ban className="mr-2 h-4 w-4" /> Cancel Order</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [makeDeliveryMutation]);

  const table = useReactTable({
    data: sales,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <Card className="printable-area h-full flex flex-col">
      <CardHeader className="non-printable pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales Orders</CardTitle>
            <CardDescription>Manage and track customer sales orders.</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search orders..." className="pl-8 w-[200px]" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex justify-center items-center rounded-full text-[10px]">{activeFilterCount}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDialogOpen(p => ({ ...p, status: true }))}>Status {filters.status && '✓'}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogOpen(p => ({ ...p, date: true }))}>Date Range {filters.startDate && '✓'}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogOpen(p => ({ ...p, salesPerson: true }))}>Sales Person {filters.salesPersonId && '✓'}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogOpen(p => ({ ...p, salesArea: true }))}>Sales Area {filters.salesArea && '✓'}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogOpen(p => ({ ...p, customer: true }))}>Customer {filters.customerId && '✓'}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogOpen(p => ({ ...p, reference: true }))}>Reference # {filters.reference && '✓'}</DropdownMenuItem>
                {activeFilterCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={clearFilters}><X className="mr-2 h-4 w-4" /> Clear All Filters</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Columns className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table.getAllColumns().filter(col => col.getCanHide()).map(col => (
                  <DropdownMenuCheckboxItem key={col.id} className="capitalize" checked={col.getIsVisible()} onCheckedChange={val => col.toggleVisibility(!!val)}>
                    {col.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <AddSalesOrderDialog />
          </div>
        </div>
      </CardHeader>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="px-6 pb-2 flex flex-wrap gap-2 non-printable">
          {filters.status && <Badge variant="outline" className="gap-1">Status: {filters.status} <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange('status', '')} /></Badge>}
          {filters.startDate && <Badge variant="outline" className="gap-1">From: {filters.startDate} <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange('startDate', '')} /></Badge>}
          {filters.endDate && <Badge variant="outline" className="gap-1">To: {filters.endDate} <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange('endDate', '')} /></Badge>}
          {filters.salesPersonId && <Badge variant="outline" className="gap-1">Person: {salesPersons.find(s => s.id.toString() === filters.salesPersonId)?.name || filters.salesPersonId} <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange('salesPersonId', '')} /></Badge>}
          {filters.salesArea && <Badge variant="outline" className="gap-1">Area: {filters.salesArea} <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange('salesArea', '')} /></Badge>}
          {filters.customerId && <Badge variant="outline" className="gap-1">Customer: {customers.find(c => c.id === filters.customerId)?.name || 'Selected'} <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange('customerId', '')} /></Badge>}
          {filters.reference && <Badge variant="outline" className="gap-1">Ref: {filters.reference} <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange('reference', '')} /></Badge>}
          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={clearFilters}>Clear all</Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="px-6 pb-4 non-printable">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 border"><p className="text-xs text-muted-foreground font-medium">Total Orders</p><p className="text-2xl font-bold">{summary.totalCount.toLocaleString('en-PH')}</p></div>
          <div className="bg-muted/50 rounded-lg p-4 border"><p className="text-xs text-muted-foreground font-medium">Total Amount</p><p className="text-2xl font-bold text-primary">₱{summary.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
        </div>
      </div>

      <CardContent className="flex-1 overflow-hidden">
        <Table wrapperClassName="max-h-[500px] overflow-auto border rounded-md">
          <TableHeader className="sticky top-0 z-30 bg-background">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead key={header.id} className={cn(header.column.id === 'total' && 'text-right', header.column.id === 'status' && 'text-center')}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No sales orders found matching constraints.</TableCell></TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {!isLoading && sales.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 non-printable">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</Label>
              <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger id="rows-per-page" className="h-8 w-[70px] text-xs"><SelectValue placeholder={limit.toString()} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="order-1 sm:order-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem><PaginationPrevious onClick={() => handlePageChange(Math.max(1, currentPage - 1))} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
                  <PaginationItem><PaginationLink>{currentPage} of {totalPages}</PaginationLink></PaginationItem>
                  <PaginationItem><PaginationNext onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <AddSalesOrderDialog
        isOpen={isEditOpen}
        hideTrigger={true}
        onOpenChange={(open) => { setIsEditOpen(open); if (!open) setOrderToEdit(null); }}
        initialData={orderToEdit || undefined}
        onSuccess={() => { refetch(); setIsEditOpen(false); setOrderToEdit(null); }}
      />

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will cancel (delete) the sales order and <strong>automatically reverse the product quantities</strong> back into your inventory. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (orderToDelete) { deleteMutation.mutate(orderToDelete); setOrderToDelete(null); } }}>Cancel Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filter Dialogs */}
      <Dialog open={dialogOpen.status} onOpenChange={(v) => setDialogOpen(p => ({ ...p, status: v }))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Status</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val === 'all' ? '' : val)}>
              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Statuses</SelectItem>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.date} onOpenChange={(v) => setDialogOpen(p => ({ ...p, date: v }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Filter Date Range</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>From</Label><Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} /></div>
            <div className="grid gap-2"><Label>To</Label><Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} /></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.salesPerson} onOpenChange={(v) => setDialogOpen(p => ({ ...p, salesPerson: v }))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Sales Person</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={filters.salesPersonId} onValueChange={(val) => handleFilterChange('salesPersonId', val === 'all' ? '' : val)}>
              <SelectTrigger><SelectValue placeholder="Select Sales Person" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Sales Persons</SelectItem>{salesPersons.map(sp => <SelectItem key={sp.id} value={sp.id.toString()}>{sp.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.salesArea} onOpenChange={(v) => setDialogOpen(p => ({ ...p, salesArea: v }))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Sales Area</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4"><Input placeholder="Enter Sales Area..." value={filters.salesArea} onChange={(e) => handleFilterChange('salesArea', e.target.value)} /></div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.customer} onOpenChange={(v) => setDialogOpen(p => ({ ...p, customer: v }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Filter Customer</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={filters.customerId} onValueChange={(val) => handleFilterChange('customerId', val === 'all' ? '' : val)}>
              <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
              <SelectContent className="max-h-[300px]"><SelectItem value="all">All Customers</SelectItem>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen.reference} onOpenChange={(v) => setDialogOpen(p => ({ ...p, reference: v }))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Reference</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4"><Input placeholder="Enter Reference #" value={filters.reference} onChange={(e) => handleFilterChange('reference', e.target.value)} /></div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={orderToPrint}
        open={isOrderDetailsOpen}
        mode={orderDialogMode}
        onOpenChange={(open) => { setIsOrderDetailsOpen(open); if (!open) { setOrderToPrint(null); setOrderDialogMode('order'); } }}
      />
    </Card>
  );
}


'use client';

import { useState, useEffect } from 'react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { ArrowLeft, Printer, Trash2, ChevronDown, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CustomerSelectionField } from '../invoices/customer-selection-field';
import { useForm } from 'react-hook-form';
import { OrderDetailsDialog, OrderDialogMode } from './order-details-dialog';

const ALL_STATUSES: Sale['status'][] = ['Pending', 'To Deliver', 'Fully Delivered', 'Paid', 'Shipped', 'Delivered', 'Returned', 'Failed'];

function getStatusVariant(status: string) {
  switch (status) {
    case 'Paid':
    case 'Fully Delivered':
      return 'default'; // primary/black
    case 'Pending':
      return 'secondary';
    case 'To Deliver':
      return 'secondary'; // or 'warning' if available, but default badge doesn't have warning. secondary is grey.
      // Maybe use specific classes later if needed.
    case 'Failed':
    case 'Returned':
      return 'destructive';
    case 'Shipped':
    case 'Delivered':
      return 'outline';
    default:
      return 'secondary';
  }
}





// ... imports
import { MoreHorizontal, FileText, Truck, Edit, Ban, ClipboardList, Receipt } from 'lucide-react';
// ... other code

function SaleOrderRow({ sale, onPrint, onDelete, onEdit, onMakeDelivery, onDeliveryNote, onMakeInvoice }: { 
    sale: Sale; 
    onPrint: () => void; 
    onDelete: (id: string) => void;
    onEdit: (sale: Sale) => void;
    onMakeDelivery: (sale: Sale) => void;
    onDeliveryNote: (sale: Sale) => void;
    onMakeInvoice: (sale: Sale) => void;
}) {
  const displayDate = sale.orderDate || sale.date;
  const deliveryDate = sale.deliveryDate;
  const isFullyDelivered = sale.status === 'Fully Delivered';

  return (
    <TableRow key={sale.id}>
      <TableCell className="font-medium text-xs text-muted-foreground">
         {sale.salesPerson || 'N/A'}
      </TableCell>
      <TableCell className="font-medium">
         {sale.customer.name}
      </TableCell>
      <TableCell className="text-xs">
         {sale.reference || '-'}
      </TableCell>
      <TableCell className="">
        {displayDate ? format(new Date(displayDate), 'PP') : 'N/A'}
      </TableCell>
       <TableCell className="">
        {deliveryDate ? format(new Date(deliveryDate), 'PP') : '-'}
      </TableCell>
      <TableCell className="text-right font-medium">
        {sale.formattedTotal || `₱${sale.total.toFixed(2)}`}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={getStatusVariant(sale.status)} className="my-[-4px] mx-[-8px] py-1">
          {sale.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right non-printable">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={onPrint}>
                    <FileText className="mr-2 h-4 w-4" /> Order Detail
                </DropdownMenuItem>
                
                {/* Actions for Fully Delivered status */}
                {isFullyDelivered && (
                    <>
                        <DropdownMenuItem onClick={() => onDeliveryNote(sale)}>
                            <ClipboardList className="mr-2 h-4 w-4" /> Delivery Note
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMakeInvoice(sale)}>
                            <Receipt className="mr-2 h-4 w-4" /> Make Invoice
                        </DropdownMenuItem>
                    </>
                )}
                
                {/* Show Make Delivery if status is Pending, Paid, Shipped, or To Deliver */}
                {['Pending', 'Paid', 'Shipped', 'To Deliver'].includes(sale.status) && (
                     <DropdownMenuItem onClick={() => onMakeDelivery(sale)}>
                        <Truck className="mr-2 h-4 w-4" /> Make Delivery
                    </DropdownMenuItem>
                )}
                
                {/* Show Edit Order and Cancel Order only if NOT Fully Delivered */}
                {!isFullyDelivered && (
                    <>
                        <DropdownMenuItem onClick={() => onEdit(sale)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Order
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(sale.id)}>
                            <Ban className="mr-2 h-4 w-4" /> Cancel Order
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ... SalesOrderPrintView



// ... SalesOrderPrintView remains same ...
function SalesOrderPrintView({ order, onBack }: { order: Sale, onBack: () => void }) {
  const displayDate = order.invoiceDate || order.date;
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="icon" onClick={onBack} className="non-printable">
                <ArrowLeft className="h-4 w-4" />
              </Button>
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
          <div>
            <p className="font-semibold text-foreground">Customer:</p>
            <p>{order.customer.name}</p>
            <p>{order.customer.contactNumber}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Order Date:</p>
            <p>{displayDate ? format(new Date(displayDate), 'PPP') : 'N/A'}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Status:</p>
            <p>{order.status}</p>
          </div>
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
                <TableCell className="text-right">{item.quantity}</TableCell>
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
          <div className="space-y-2">
            <div className="border-b border-foreground w-full"></div>
            <p className="text-center">Signature over Printed Name</p>
          </div>
          <div className="space-y-2">
            <div className="border-b border-foreground w-full"></div>
            <p className="text-center">Date Received</p>
          </div>
          <div className="col-span-2 text-center text-xs text-muted-foreground pt-4">
            Received the above goods in good order and condition.
          </div>
        </div>
      </CardFooter>
      <div className="flex justify-end mt-4 p-6 pt-0 non-printable">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Order
        </Button>
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
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  // Filters State
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    salesPersonId: '',
    salesArea: '',
    customerId: '',
    reference: '',
  });

  // Dialog States
  const [dialogOpen, setDialogOpen] = useState<{
    status: boolean;
    date: boolean;
    salesPerson: boolean;
    salesArea: boolean;
    customer: boolean;
    reference: boolean;
  }>({
    status: false,
    date: false,
    salesPerson: false,
    salesArea: false,
    customer: false,
    reference: false,
  });

  // Data for Filters
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    // Fetch filter data
    const fetchFilterData = async () => {
        try {
            const spRes = await fetch('/api/sales-persons?activeOnly=true');
            const spData = await spRes.json();
            if(spData.success) setSalesPersons(spData.data);

            const cRes = await fetch('/api/customers');
            const cData = await cRes.json();
            if(cData.success) setCustomers(cData.data);
        } catch(e) { console.error(e); }
    };
    fetchFilterData();
  },[]);

  const fetchSalesOrders = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...filters
      });
      // Remove empty params
      Array.from(params.keys()).forEach(key => {
        if (!params.get(key)) params.delete(key);
      });

      const response = await fetch(`/api/sales/orders?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setSales(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setCurrentPage(data.pagination.page);
        }
      } else {
        toast({
            title: 'Error',
            description: 'Failed to fetch sales orders',
            variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
          title: 'Error',
          description: 'Error connecting to server',
          variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesOrders(currentPage);
  }, [currentPage, filters]); // Re-fetch when filters change

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to page 1 on filter
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sales/orders/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Order Deleted',
          description: 'The sales order has been deleted and stock returned to inventory.',
        });
        fetchSalesOrders(currentPage);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete order',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
      if (!orderToDelete) return;
      await handleDelete(orderToDelete);
      setOrderToDelete(null);
  };

  const handleMakeDelivery = async (sale: Sale) => {
      try {
           setIsLoading(true);
           const response = await fetch(`/api/sales/orders/${sale.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...sale, status: 'Fully Delivered' }) 
          });
          const data = await response.json();
          if (data.success) {
            toast({ title: 'Order Delivered', description: 'Status updated to Fully Delivered.' });
            fetchSalesOrders(currentPage);
          } else {
             toast({ title: 'Error', variant: 'destructive', description: data.error });
          }
      } catch (e) {
          console.error(e);
          toast({ title: 'Error', variant: 'destructive', description: 'Failed to update status' });
      } finally {
          setIsLoading(false);
      }
  };

  const handlePrint = (order: Sale) => {
    setOrderToPrint(order);
    setOrderDialogMode('order');
    setIsOrderDetailsOpen(true);
  };

  const handleDeliveryNote = (sale: Sale) => {
    // Open order details dialog for delivery note
    setOrderToPrint(sale);
    setOrderDialogMode('delivery-note');
    setIsOrderDetailsOpen(true);
  };

  const handleMakeInvoice = (sale: Sale) => {
    // TODO: Navigate to create invoice page or open dialog
    toast({ title: 'Make Invoice', description: `Creating invoice for order ${sale.reference || sale.id}` });
    // Placeholder: Could navigate to /sales/invoices/new with order data
  };

  const clearFilters = () => {
      setFilters({
        status: '',
        startDate: '',
        endDate: '',
        salesPersonId: '',
        salesArea: '',
        customerId: '',
        reference: '',
      });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <Card className="printable-area h-full flex flex-col">
      <CardHeader className="non-printable pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales Orders</CardTitle>
            <CardDescription>
              Manage and track customer sales orders.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Filter Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 relative">
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex justify-center items-center rounded-full text-[10px]">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDialogOpen(prev => ({...prev, status: true}))}>
                        Status {filters.status && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialogOpen(prev => ({...prev, date: true}))}>
                        Date Range {filters.startDate && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialogOpen(prev => ({...prev, salesPerson: true}))}>
                        Sales Person {filters.salesPersonId && "✓"}
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => setDialogOpen(prev => ({...prev, salesArea: true}))}>
                        Sales Area {filters.salesArea && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialogOpen(prev => ({...prev, customer: true}))}>
                        Customer {filters.customerId && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialogOpen(prev => ({...prev, reference: true}))}>
                        Reference # {filters.reference && "✓"}
                    </DropdownMenuItem>
                    {activeFilterCount > 0 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={clearFilters}>
                                <X className="mr-2 h-4 w-4" /> Clear All Filters
                            </DropdownMenuItem>
                        </>
                    )}
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

      <CardContent className="flex-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="">Order Date</TableHead>
              <TableHead className="">Delivery Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right non-printable"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No sales orders found matching constraints.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <SaleOrderRow
                  key={sale.id}
                  sale={sale}
                  onPrint={() => handlePrint(sale)}
                  onDelete={(id) => setOrderToDelete(id)}
                  onEdit={(s) => { setOrderToEdit(s); setIsEditOpen(true); }}
                  onMakeDelivery={handleMakeDelivery}
                  onDeliveryNote={handleDeliveryNote}
                  onMakeInvoice={handleMakeInvoice}
                />
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {!isLoading && sales.length > 0 && (
            <div className="mt-4 non-printable">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                aria-disabled={currentPage === 1}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        {/* Simplified pagination for brevity */}
                         <PaginationItem>
                            <PaginationLink>{currentPage} of {totalPages}</PaginationLink>
                         </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                aria-disabled={currentPage === totalPages}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
       <AddSalesOrderDialog 
          isOpen={isEditOpen} 
          hideTrigger={true}
          onOpenChange={(open) => {
              setIsEditOpen(open);
              if(!open) setOrderToEdit(null);
          }}
          initialData={orderToEdit || undefined}
          onSuccess={() => {
              fetchSalesOrders(currentPage);
              setIsEditOpen(false);
              setOrderToEdit(null);
          }}
       />

       {/* Delete Alert Dialog */}
       <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will cancel (delete) the sales order and <strong>automatically reverse the product quantities</strong> back into your inventory.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Back</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={confirmDelete}
                >
                  Cancel Order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>

       {/* FILTER DIALOGS */}
      
      {/* Status Dialog */}
      <Dialog open={dialogOpen.status} onOpenChange={(v) => setDialogOpen(prev => ({...prev, status: v}))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Status</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val === 'all' ? '' : val)}>
                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
             </Select>
          </div>
        </DialogContent>
      </Dialog>

      {/* Date Range Dialog */}
      <Dialog open={dialogOpen.date} onOpenChange={(v) => setDialogOpen(prev => ({...prev, date: v}))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Filter Date Range</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid gap-2">
                <Label>From</Label>
                <Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
             </div>
             <div className="grid gap-2">
                <Label>To</Label>
                <Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
             </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Sales Person Dialog */}
      <Dialog open={dialogOpen.salesPerson} onOpenChange={(v) => setDialogOpen(prev => ({...prev, salesPerson: v}))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Sales Person</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <Select value={filters.salesPersonId} onValueChange={(val) => handleFilterChange('salesPersonId', val === 'all' ? '' : val)}>
                <SelectTrigger><SelectValue placeholder="Select Sales Person" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Sales Persons</SelectItem>
                    {salesPersons.map(sp => <SelectItem key={sp.id} value={sp.id.toString()}>{sp.name}</SelectItem>)}
                </SelectContent>
             </Select>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Area Dialog */}
      <Dialog open={dialogOpen.salesArea} onOpenChange={(v) => setDialogOpen(prev => ({...prev, salesArea: v}))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Sales Area</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <Input placeholder="Enter Sales Area..." value={filters.salesArea} onChange={(e) => handleFilterChange('salesArea', e.target.value)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Dialog */}
      <Dialog open={dialogOpen.customer} onOpenChange={(v) => setDialogOpen(prev => ({...prev, customer: v}))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Filter Customer</DialogTitle></DialogHeader>
           <div className="grid gap-4 py-4">
              {/* Reuse CustomerSelectionField logic or simple Select */}
              <Select value={filters.customerId} onValueChange={(val) => handleFilterChange('customerId', val === 'all' ? '' : val)}>
                <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
             </Select>
           </div>
        </DialogContent>
      </Dialog>

      {/* Reference Dialog */}
      <Dialog open={dialogOpen.reference} onOpenChange={(v) => setDialogOpen(prev => ({...prev, reference: v}))}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Filter Reference</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <Input placeholder="Enter Reference #" value={filters.reference} onChange={(e) => handleFilterChange('reference', e.target.value)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <OrderDetailsDialog 
        order={orderToPrint}
        open={isOrderDetailsOpen}
        mode={orderDialogMode}
        onOpenChange={(open) => {
          setIsOrderDetailsOpen(open);
          if (!open) {
            setOrderToPrint(null);
            setOrderDialogMode('order');
          }
        }}
      />

    </Card>
  );
}

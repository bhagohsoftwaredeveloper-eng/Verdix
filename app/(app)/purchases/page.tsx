
'use client';

import { useMemo, useState } from 'react';
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

import { Badge } from '@/components/ui/badge';
import { PurchaseOrder, Product } from '../../../lib/types';
import { mockProducts } from '../../../lib/data';
import { usePurchaseOrders, useProducts, useBusinessProfile } from '../../../hooks/use-api';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AddPurchaseOrderDialog } from './add-purchase-order-dialog';
import { ReceivePurchaseOrderDialog } from './receive-purchase-order-dialog';
import { ViewPurchaseOrderDialog } from './view-purchase-order-dialog';
import { ScheduledOrdersDialog } from './scheduled-orders-dialog';

import { Button } from '@/components/ui/button';
import { Check, Truck, Search, CalendarIcon, X, Printer, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Logo } from '@/components/logo';


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FileText, Ban, RotateCcw, Edit, Copy } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function PurchaseOrderActions({ 
  order, 
  onUpdateOrder, 
  onReceive, 
  onPrint, 
  onViewDetails,
  onReorder,
  onEdit 
}: { 
  order: PurchaseOrder, 
  onUpdateOrder: (id: string, updates: Partial<PurchaseOrder>) => void, 
  onReceive: (order: PurchaseOrder) => void,
  onPrint: () => void,
  onViewDetails: () => void,
  onReorder: (order: PurchaseOrder) => void,
  onEdit: (order: PurchaseOrder) => void
}) {
  const { toast } = useToast();

  const handleApprove = () => {
    onUpdateOrder(order.id, { status: 'Approved' });
    toast({ title: 'Order Approved', description: `Order ${order.id.substring(0, 7)} has been approved.` });
  };

  const handleVoid = () => {
    onUpdateOrder(order.id, { status: 'Cancelled' });
    toast({ title: "Order Voided", description: "Purchase order has been cancelled." });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        
        {/* Status Actions */}
        {order.status === 'Pending' && (
          <DropdownMenuItem onClick={handleApprove}>
            <Check className="mr-2 h-4 w-4" /> Approve
          </DropdownMenuItem>
        )}
        
        {['Approved', 'Paid', 'Shipped'].includes(order.status) && (
          <DropdownMenuItem onClick={() => onReceive(order)}>
             <Truck className="mr-2 h-4 w-4" /> Receive Items
          </DropdownMenuItem>
        )}

        {/* General Actions */}
        <DropdownMenuItem onClick={onViewDetails}>
          <FileText className="mr-2 h-4 w-4" /> View Details
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onReorder(order)}>
           <Copy className="mr-2 h-4 w-4" /> Reorder
        </DropdownMenuItem>

         {/* Edit - Only for Pending ideally, or allow restricted edits. For now basic. */}
         {order.status === 'Pending' && (
             <DropdownMenuItem onClick={() => onEdit(order)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
             </DropdownMenuItem>
         )}

        <DropdownMenuItem onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Destructive / Final Actions */}
        {(order.status === 'Pending' || order.status === 'Approved') && (
            <DropdownMenuItem onClick={handleVoid} className="text-destructive focus:text-destructive">
               <Ban className="mr-2 h-4 w-4" /> Void / Cancel
            </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PurchaseOrderRow({ 
  order, 
  onUpdateOrder, 
  onReceive, 
  onPrint, 
  onReorder,
  onEdit,
  onViewDetails
}: { 
  order: PurchaseOrder, 
  onUpdateOrder: (id: string, updates: Partial<PurchaseOrder>) => void, 
  onReceive: (order: PurchaseOrder) => void,
  onPrint: () => void,
  onReorder: (order: PurchaseOrder) => void,
  onEdit: (order: PurchaseOrder) => void,
  onViewDetails: (order: PurchaseOrder) => void
}) {
  
  const statusVariant = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Received': return 'success'; // Assuming success variant exists or default to default
      case 'Pending': return 'secondary';
      case 'Approved':
      case 'Shipped': return 'default';
      case 'Failed':
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  // Calculate strict order total (items subtotal)
  const itemsSubtotal = order.items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
  
  return (
    <>
      <TableRow className="hover:bg-muted/50 transition-colors data-[state=selected]:bg-muted text-xs group">
        <TableCell className="w-8 p-1">
          {/* Removed Accordion Trigger */}
        </TableCell>
        <TableCell className="px-2 py-1 font-medium text-primary whitespace-nowrap">{order.referenceNumber || order.id.substring(0, 8).toUpperCase()}</TableCell>
        <TableCell className="px-2 py-1 whitespace-nowrap">{order.orderedBy || '-'}</TableCell>
        <TableCell className="px-2 py-1 text-right whitespace-nowrap">₱{itemsSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
        <TableCell className="px-2 py-1 text-right whitespace-nowrap">₱{(order.shippingFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
        <TableCell className="px-2 py-1 text-right whitespace-nowrap">₱{(order.vatAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
        <TableCell className="px-2 py-1 text-right font-bold whitespace-nowrap">₱{order.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
        <TableCell className="px-2 py-1 text-right whitespace-nowrap">₱{(order.receivedTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
        <TableCell className="px-2 py-1 max-w-[150px] truncate" title={order.supplierName}>
            {order.supplierName}
        </TableCell>
        <TableCell className="px-2 py-1 whitespace-nowrap">{format(new Date(order.date), 'MMM dd, yyyy')}</TableCell>
        <TableCell className="px-2 py-1 whitespace-nowrap">{order.deliveryDate ? format(new Date(order.deliveryDate), 'MMM dd, yyyy') : '-'}</TableCell>
        <TableCell className="px-2 py-1 text-center">
          <Badge variant={statusVariant(order.status) as any} className="rounded-sm uppercase text-[9px] px-1.5 py-0 min-w-[70px] justify-center h-5">
            {order.status}
          </Badge>
        </TableCell>
        <TableCell className="px-2 py-1 text-right">
          <PurchaseOrderActions 
            order={order} 
            onUpdateOrder={onUpdateOrder} 
            onReceive={onReceive} 
            onPrint={onPrint}
            onViewDetails={() => onViewDetails(order)}
            onReorder={onReorder}
            onEdit={onEdit}
          />
        </TableCell>
      </TableRow>
      {/* Removed Accordion Content */}
    </>
  );
}

function PurchaseOrderSkeleton() {
  return (
    <TableRow>
      <TableCell className='w-12'><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell className="text-right"><div className='flex gap-2 justify-end'><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-24" /></div></TableCell>
    </TableRow>
  );
}

function PurchaseOrderPrintView({ order, onBack }: { order: PurchaseOrder, onBack: () => void }) {
  const { products } = useProducts();
  const { profile } = useBusinessProfile();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="icon" onClick={onBack} className="non-printable">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle>Purchase Order</CardTitle>
            </div>
            <CardDescription>Order ID: {order.id}</CardDescription>
          </div>
          <div className="text-right">
             <div className="flex items-center justify-end gap-2">
               <Logo className="size-7 text-primary" />
               <h1 className="text-xl font-semibold font-headline text-primary">{profile?.businessName || 'StockPilot'}</h1>
             </div>
             <div className="text-xs text-muted-foreground mt-1">
                <p>{profile?.address}</p>
                <p>{profile?.contactNumber} {profile?.email && `• ${profile.email}`}</p>
             </div>
          </div>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground pt-4">
          <div>
            <p className="font-semibold text-foreground">Supplier:</p>
            <p>{order.supplierName}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Order Date:</p>
            <p>{format(new Date(order.date), 'PPP')}</p>
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
              <TableHead className="text-center">Remaining QTY</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Cost per Item</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map(item => {
               const product = products.find(p => p.id === item.productId);
               const currentStock = product ? product.stock : (item.currentStock || 0);
               
               return (
              <TableRow key={item.productId}>
                <TableCell>{item.productName}</TableCell>
                <TableCell className="text-center">{currentStock}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">₱{item.cost.toFixed(2)}</TableCell>
                <TableCell className="text-right">₱{(item.cost * item.quantity).toFixed(2)}</TableCell>
              </TableRow>
            )})}
            <TableRow className="border-t-2 border-primary">
              <TableCell colSpan={4} className="text-right font-bold text-lg">Total</TableCell>
              <TableCell className="text-right font-bold text-lg">₱{order.total.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div className="flex justify-end mt-4 non-printable">
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [reorderData, setReorderData] = useState<PurchaseOrder | null>(null);
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  
  const [orderToPrint, setOrderToPrint] = useState<PurchaseOrder | null>(null);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  
  const [isScheduledOrderOpen, setIsScheduledOrderOpen] = useState(false);
  const [scheduledSupplierId, setScheduledSupplierId] = useState<string | undefined>(undefined);

  const pageSize = 10;

  const { toast } = useToast();

  // Use the real API hook
  const { purchaseOrders, loading, refetch, pagination } = usePurchaseOrders(searchTerm, undefined, currentPage, pageSize);

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result = await response.json();
      if (result.success) {
        refetch();
      } else {
         throw new Error(result.error || 'Failed to update');
      }
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      // Optional: Toast error here or let child handle logic
    }
  };

  const handleReceiveConfirm = async (receivedItems: { productId: string; quantity: number }[]) => {
    if (!orderToReceive) return;

    try {
      // Update stocks
      await Promise.all(receivedItems.map(item =>
        fetch(`/api/products/${item.productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockIncrement: item.quantity }),
        })
      ));

      // Calculate received total value
      const receivedTotalValue = receivedItems.reduce((acc, receivedItem) => {
        const originalItem = orderToReceive.items.find(i => i.productId === receivedItem.productId);
        const cost = originalItem ? originalItem.cost : 0;
        return acc + (cost * receivedItem.quantity);
      }, 0);

      // Update purchase order status and total
      await updatePurchaseOrder(orderToReceive.id, { 
        status: 'Received',
        receivedTotal: receivedTotalValue
      });

      toast({ title: "Stock Received", description: "Inventory has been updated successfully." });
      setIsReceiveDialogOpen(false);
      setOrderToReceive(null);
      refetch();
      window.dispatchEvent(new Event('stock-updated'));
    } catch (error) {
      console.error('Failed to receive items:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update stock items.", 
        variant: "destructive" 
      });
    }
  };

  const addPurchaseOrder = async (order: PurchaseOrder) => {
    try {
      // TODO: Implement API call to create purchase order
      console.log('Adding purchase order:', order);
      // For now, just refetch the data
      refetch();
      setEditingOrder(null); // Clear edit state
    } catch (error) {
      console.error('Failed to add purchase order:', error);
    }
  };

  // API handles search and pagination. We use the results directly.
  // Note: Date range filtering is temporarily disabled for server-side pagination unless implemented in API.
  const filteredPurchaseOrders = purchaseOrders;

  const handleSearch = () => {
    setSearchTerm(searchQuery);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSearchQuery('');
    setDateRange(undefined);
    setCurrentPage(1);
  };

  const handlePrint = (order: PurchaseOrder) => {
    setOrderToPrint(order);
  };

  const handleEdit = (order: PurchaseOrder) => {
      setEditingOrder(order);
      setIsEditOpen(true);
  };
  
  const handleReorder = (order: PurchaseOrder) => {
      setReorderData(order);
      setIsReorderOpen(true);
  };

  const handleViewDetails = (order: PurchaseOrder) => {
    setViewingOrder(order);
  };

  const hasActiveFilters = searchTerm || dateRange;

  if (orderToPrint) {
    return <PurchaseOrderPrintView order={orderToPrint} onBack={() => setOrderToPrint(null)} />
  }

  return (
    <Card className="printable-area">
      <CardHeader className="non-printable">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Purchases</CardTitle>
            <CardDescription>
              A list of all purchase orders from your suppliers.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ScheduledOrdersDialog 
                onCreateOrder={(supplierId) => {
                    setScheduledSupplierId(supplierId);
                    setIsScheduledOrderOpen(true);
                }} 
            />
            <AddPurchaseOrderDialog onAddOrder={addPurchaseOrder} />
            
            {isScheduledOrderOpen && (
                <AddPurchaseOrderDialog 
                    open={isScheduledOrderOpen}
                    onOpenChange={setIsScheduledOrderOpen}
                    prefillSupplierId={scheduledSupplierId}
                    onAddOrder={(order) => {
                        addPurchaseOrder(order);
                        setIsScheduledOrderOpen(false);
                    }}
                />
            )}
            
            {(isEditOpen && editingOrder) && (
                <AddPurchaseOrderDialog 
                    editOrder={editingOrder} 
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    onAddOrder={(order) => {
                        addPurchaseOrder(order);
                        setIsEditOpen(false);
                    }}
                /> 
            )}

            {(isReorderOpen && reorderData) && (
                <AddPurchaseOrderDialog 
                    reorderData={reorderData} 
                    open={isReorderOpen}
                    onOpenChange={setIsReorderOpen}
                    onAddOrder={(order) => {
                        addPurchaseOrder(order);
                        setIsReorderOpen(false);
                    }}
                /> 
            )}

            {orderToReceive && (
              <ReceivePurchaseOrderDialog 
                open={isReceiveDialogOpen} 
                onOpenChange={setIsReceiveDialogOpen}
                order={orderToReceive}
                onConfirm={handleReceiveConfirm}
              />
            )}

            <ViewPurchaseOrderDialog 
              open={!!viewingOrder} 
              onOpenChange={(open) => !open && setViewingOrder(null)} 
              order={viewingOrder} 
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="relative flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by ID, supplier..."
                className="pl-8 sm:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>
            <Button variant="secondary" onClick={handleSearch}>Search</Button>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} size="icon">
                <X className="h-4 w-4" />
                <span className="sr-only">Reset filters</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border m-4">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="w-8 p-1 text-center"></TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Ref No</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Ordered by</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Order Total</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Shipping</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Included Vat</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Grand total</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Received Total</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Supplier</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Issue date</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Delivery date</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-center whitespace-nowrap">Status</TableHead>
                <TableHead className="w-8 p-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchaseOrders?.map((order) => (
                <PurchaseOrderRow
                  key={order.id}
                  order={order}
                  onUpdateOrder={updatePurchaseOrder}
                  onReceive={(order) => {
                    setOrderToReceive(order);
                    setIsReceiveDialogOpen(true);
                  }}
                  onPrint={() => handlePrint(order)}
                  onReorder={handleReorder}
                  onEdit={handleEdit}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        
        {pagination && pagination.total > 0 && (
          <div className="py-2 border-t px-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                <PaginationItem>
                  <span className="text-xs text-muted-foreground px-4 whitespace-nowrap">
                    Page {currentPage} of {Math.ceil(pagination.total / pageSize)}
                  </span>
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className={!pagination.hasMore ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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


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
import { usePurchaseOrders } from '../../../hooks/use-api';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AddPurchaseOrderDialog } from './add-purchase-order-dialog';
import { ReceivePurchaseOrderDialog } from './receive-purchase-order-dialog';

import { Button } from '@/components/ui/button';
import { Check, Truck, ChevronRight, Search, CalendarIcon, X, Printer, ArrowLeft } from 'lucide-react';
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

function PurchaseOrderActions({ 
  order, 
  onUpdateOrder, 
  onReceive, 
  onPrint, 
  onViewDetails,
  onReorder 
}: { 
  order: PurchaseOrder, 
  onUpdateOrder: (id: string, updates: Partial<PurchaseOrder>) => void, 
  onReceive: (order: PurchaseOrder) => void,
  onPrint: () => void,
  onViewDetails: () => void,
  onReorder: (order: PurchaseOrder) => void
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
             <DropdownMenuItem onClick={() => toast({ title: "Edit", description: "Edit functionality coming soon." })}>
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
  onReceive, // This prop is now the handler from PurchasesPage
  onPrint, 
  onReorder 
}: { 
  order: PurchaseOrder, 
  onUpdateOrder: (id: string, updates: Partial<PurchaseOrder>) => void, 
  onReceive: (order: PurchaseOrder) => void, // Pass this down to PurchaseOrderActions
  onPrint: () => void,
  onReorder: (order: PurchaseOrder) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const statusVariant = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Received': return 'default';
      case 'Pending': return 'secondary';
      case 'Approved':
      case 'Shipped': return 'outline';
      case 'Failed':
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="w-12">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          </Button>
        </TableCell>
        <TableCell className="font-medium">{order.id.substring(0, 7)}...</TableCell>
        <TableCell>
          <div className="font-medium">{order.supplierName}</div>
        </TableCell>
        <TableCell className="hidden md:table-cell">{format(new Date(order.date), 'PP')}</TableCell>
        <TableCell>
          <Badge variant={statusVariant(order.status)}>
            {order.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right">₱{order.total.toFixed(2)}</TableCell>
        <TableCell className="text-right">
          <PurchaseOrderActions 
            order={order} 
            onUpdateOrder={onUpdateOrder} 
            onReceive={onReceive} 
            onPrint={onPrint}
            onViewDetails={() => setIsOpen(!isOpen)}
            onReorder={onReorder}
          />
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/50 non-printable">
          <TableCell colSpan={7}>
            <div className="p-4">
              <h4 className="font-semibold mb-2">Order Items ({order.items.length})</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost per Item</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map(item => (
                    <TableRow key={item.productId || Math.random()}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₱{item.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₱{(item.cost * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
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
          <div className="flex items-center gap-2">
            <Logo className="size-7 text-primary" />
            <h1 className="text-xl font-semibold font-headline text-primary">StockPilot</h1>
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
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Cost per Item</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map(item => (
              <TableRow key={item.productId}>
                <TableCell>{item.productName}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">₱{item.cost.toFixed(2)}</TableCell>
                <TableCell className="text-right">₱{(item.cost * item.quantity).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 border-primary">
              <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [orderToPrint, setOrderToPrint] = useState<PurchaseOrder | null>(null);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);
  const { toast } = useToast();

  // Use the real API hook
  const { purchaseOrders, loading, refetch } = usePurchaseOrders(searchTerm);

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

      // Update purchase order status
      await updatePurchaseOrder(orderToReceive.id, { status: 'Received' });

      toast({ title: "Stock Received", description: "Inventory has been updated successfully." });
      setIsReceiveDialogOpen(false);
      setOrderToReceive(null);
      refetch();
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
    } catch (error) {
      console.error('Failed to add purchase order:', error);
    }
  };

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      // Date filter
      const orderDate = new Date(order.date);
      if (dateRange?.from && orderDate < dateRange.from) return false;
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }

      // Search term filter
      const term = searchTerm.toLowerCase();
      if (!term) return true;

      const idMatch = order.id.toLowerCase().includes(term);
      const supplierMatch = order.supplierName.toLowerCase().includes(term);
      const itemMatch = order.items.some(item =>
        item.productName.toLowerCase().includes(term)
      );

      return idMatch || supplierMatch || itemMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [purchaseOrders, dateRange, searchTerm]);

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
  };

  const handlePrint = (order: PurchaseOrder) => {
    setOrderToPrint(order);
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
            <AddPurchaseOrderDialog onAddOrder={addPurchaseOrder} />
            {orderToReceive && (
              <ReceivePurchaseOrderDialog 
                open={isReceiveDialogOpen} 
                onOpenChange={setIsReceiveDialogOpen}
                order={orderToReceive}
                onConfirm={handleReceiveConfirm}
              />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by ID, supplier, product..."
              className="pl-8 sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"><span className="sr-only">Expand</span></TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right w-48"><span className="sr-only">Actions</span></TableHead>
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
                onReorder={addPurchaseOrder}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

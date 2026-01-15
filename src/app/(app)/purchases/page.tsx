
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
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { PurchaseOrder, StockAdjustment } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AddPurchaseOrderDialog } from './add-purchase-order-dialog';
import { ManageSuppliersDialog } from './ManageSuppliersDialog';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Logo } from '@/components/logo';


function ApproveButton({ order }: { order: PurchaseOrder }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  if (order.status !== 'Pending') return null;

  const handleApprove = async () => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'purchaseOrders', order.id);
    try {
      await updateDocumentNonBlocking(orderRef, { status: 'Approved' });
      toast({
        title: 'Order Approved',
        description: `Order ${order.id.substring(0, 7)} has been approved.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: 'Could not approve the order. Please try again.',
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Check className="mr-2 h-4 w-4" />
          Approve
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the order as approved and ready for processing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove}>Approve</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReceiveButton({ order }: { order: PurchaseOrder }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  if (!['Paid', 'Shipped', 'Approved'].includes(order.status)) return null;

  const handleReceive = async () => {
    if (!firestore) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const orderRef = doc(firestore, 'purchaseOrders', order.id);

        // 1. Read all product documents first.
        const productRefs = order.items.map(item => doc(firestore, 'products', item.productId));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // 2. Now perform all writes.
        transaction.update(orderRef, { status: 'Received' });

        for (const [index, productDoc] of productDocs.entries()) {
          const item = order.items[index];
          if (!productDoc.exists()) {
            throw new Error(`Product with ID ${item.productId} not found.`);
          }

          const currentStock = productDoc.data().stock;
          const newStock = currentStock + item.quantity;
          transaction.update(productRefs[index], { stock: newStock });

          const adjustmentLogRef = doc(collection(firestore, `products/${item.productId}/stockAdjustments`));
          const adjustmentLog: Omit<StockAdjustment, 'id'> = {
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            reason: `Purchase Order Received`,
            date: new Date().toISOString(),
            newStock: newStock,
          };
          transaction.set(adjustmentLogRef, adjustmentLog);
        }
      });

      toast({
        title: "Stock Received",
        description: "Inventory has been updated for the received items.",
      });

    } catch (error) {
      console.error("Error receiving stock:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Failed to update stock. Please try again.",
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="mr-2 h-4 w-4" />
          Receive
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Receive Stock?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the order as received and add the items to your inventory. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleReceive}>Receive Stock</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PurchaseOrderRow({ order, onPrint }: { order: PurchaseOrder, onPrint: () => void }) {
  const statusVariant = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Received':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Approved':
        return 'outline';
      case 'Shipped':
        return 'outline';
      case 'Failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };
  return (
    <Collapsible asChild key={order.id}>
      <TableBody>
        <TableRow>
          <TableCell className="w-12">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="group">
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
              </Button>
            </CollapsibleTrigger>
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
            <div className="flex justify-end gap-2 non-printable">
              <ApproveButton order={order} />
              <ReceiveButton order={order} />
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <tr className="bg-muted/50 non-printable">
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
                      <TableRow key={item.productId}>
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
          </tr>
        </CollapsibleContent>
      </TableBody>
    </Collapsible>
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
  const firestore = useFirestore();

  const purchaseOrdersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'purchaseOrders') : null),
    [firestore]
  );
  const { data: purchaseOrders, isLoading } = useCollection<PurchaseOrder>(purchaseOrdersCollection);

  const filteredPurchaseOrders = useMemo(() => {
    if (!purchaseOrders) return [];

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
            <ManageSuppliersDialog />
            <AddPurchaseOrderDialog />
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
              <TableHead><span className='sr-only'>Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          {isLoading && (
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => <PurchaseOrderSkeleton key={i} />)}
            </TableBody>
          )}
          {filteredPurchaseOrders?.map((order) => (
            <PurchaseOrderRow key={order.id} order={order} onPrint={() => handlePrint(order)} />
          ))}
          {!isLoading && filteredPurchaseOrders?.length === 0 && (
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  No purchase orders found.
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}


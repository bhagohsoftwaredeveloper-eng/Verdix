
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
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Sale } from '@/lib/types';
import { AddSalesOrderDialog } from './add-sales-order-dialog';
import { mockSales } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Truck, ChevronDown, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';

const ALL_STATUSES: Sale['status'][] = ['Pending', 'Paid', 'Shipped', 'Delivered', 'Returned', 'Failed'];

function getStatusVariant(status: string) {
  switch (status) {
    case 'Paid':
      return 'default';
    case 'Pending':
      return 'secondary';
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

function StatusUpdater({ order }: { order: Sale }) {
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: Sale['status']) => {
    if (newStatus === order.status) return;
    // Simulate update
    setTimeout(() => {
      toast({
        title: 'Status Updated',
        description: `Order status changed to "${newStatus}".`,
      });
    }, 500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Badge variant={getStatusVariant(order.status)} className="my-[-4px] mx-[-8px] py-1">
            {order.status}
          </Badge>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ALL_STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            disabled={status === order.status}
            onSelect={() => handleStatusChange(status)}
          >
            {status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


function SaleOrderRow({ sale, onPrint, onDelete }: { sale: Sale; onPrint: () => void; onDelete: (id: string) => void }) {
  const displayDate = sale.invoiceDate || sale.date;

  return (
    <TableRow key={sale.id}>
      <TableCell className="font-medium text-xs text-muted-foreground">{sale.id}</TableCell>
      <TableCell>
        <div className="font-medium">{sale.customer.name}</div>
        <div className="text-sm text-muted-foreground hidden md:block">
          {sale.customer.contactNumber}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {displayDate ? format(new Date(displayDate), 'PP') : 'N/A'}
      </TableCell>
      <TableCell>
        <StatusUpdater order={sale} />
      </TableCell>
      <TableCell className="text-right">
        {sale.formattedTotal || `₱${sale.total.toFixed(2)}`}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2 non-printable">
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete the sales order for <strong>{sale.customer.name}</strong> and
                  <strong> automatically reverse the product quantities</strong> back into your inventory.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(sale.id)}
                >
                  Delete Order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

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
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSalesOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sales/orders');
      const data = await response.json();
      if (data.success) {
        setSales(data.data);
      } else {
        console.error('Failed to fetch sales orders:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesOrders();
  }, []);

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
        fetchSalesOrders();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete order',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = (order: Sale) => {
    setOrderToPrint(order);
  };

  if (orderToPrint) {
    return <SalesOrderPrintView order={orderToPrint} onBack={() => setOrderToPrint(null)} />
  }

  return (
    <Card className="printable-area">
      <CardHeader className="non-printable">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales Orders</CardTitle>
            <CardDescription>
              A list of all sales orders from your customers.
            </CardDescription>
          </div>
          <AddSalesOrderDialog />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="non-printable"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No sales orders found.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <SaleOrderRow
                  key={sale.id}
                  sale={sale}
                  onPrint={() => handlePrint(sale)}
                  onDelete={handleDelete}
                />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

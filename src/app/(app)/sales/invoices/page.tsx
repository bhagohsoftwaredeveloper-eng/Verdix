'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, ChevronRight, X } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { AddSalesInvoiceDialog } from './add-sales-invoice-dialog';
import { Logo } from '@/components/logo';
import { useSalesInvoices } from '@/hooks/use-api';
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

function InvoiceRow({ sale, onPrint, onSuccess }: { sale: Sale; onPrint: () => void; onSuccess?: () => void }) {
  const [isVoiding, setIsVoiding] = useState(false);
  const { toast } = useToast();

  const handleVoid = async () => {
    try {
      setIsVoiding(true);
      const response = await fetch(`/api/sales/invoices/${sale.id}/void`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Invoice voided successfully",
        });
        onSuccess?.();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to void invoice",
          description: result.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error voiding invoice:", error);
      toast({
        variant: "destructive",
        title: "An error occurred while voiding the invoice",
      });
    } finally {
      setIsVoiding(false);
    }
  };

  const getStatusInfo = (sale: Sale): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (sale.status === 'Voided') {
      return { text: 'Voided', variant: 'destructive' };
    }
    switch (sale.status) {
      case 'Paid':
        return { text: 'Paid', variant: 'default' };
      case 'Failed':
      case 'Returned':
        return { text: sale.status, variant: 'destructive' };
      case 'Shipped':
      case 'Delivered':
        return { text: sale.status, variant: 'outline' };
      case 'Pending':
      default:
        const dueDate = sale.dueDate ? new Date(sale.dueDate) : new Date();
        if (new Date() > dueDate) {
          return { text: 'Overdue', variant: 'destructive' };
        }
        return { text: 'Due', variant: 'secondary' };
    }
  };

  const displayDate = sale.invoiceDate || sale.date;
  const statusInfo = getStatusInfo(sale);

  return (
    <Collapsible asChild key={sale.id}>
      <TableBody>
        <TableRow>
          <TableCell className="w-12">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="group">
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
              </Button>
            </CollapsibleTrigger>
          </TableCell>
          <TableCell className="font-medium">{sale.id.substring(0, 7)}...</TableCell>
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
            <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex flex-col items-end gap-2">
              <span className="font-medium">₱{sale.total.toFixed(2)}</span>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onPrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                {sale.status !== 'Voided' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isVoiding}>
                        <X className="mr-2 h-4 w-4" />
                        Void
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will void the invoice and return all items to stock. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVoid} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Void Invoice
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <tr className="bg-muted/50 non-printable">
            <TableCell colSpan={6}>
              <div className="p-4">
                <h4 className="font-semibold mb-2">Invoice Items ({sale.items.length})</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price per Item</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items.map(item => (
                      <TableRow key={item.product.id}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TableCell>
          </tr>
        </CollapsibleContent>
      </TableBody>
    </Collapsible >
  );
}

function SalesInvoicePrintView({ order, onBack }: { order: Sale; onBack: () => void }) {
  const displayDate = order.invoiceDate || order.date;
  const displayDueDate = order.dueDate || order.date;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="icon" onClick={onBack} className="non-printable">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle>Sales Invoice</CardTitle>
            </div>
            <CardDescription>Invoice ID: {order.id}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Logo className="size-7 text-primary" />
            <h1 className="text-xl font-semibold font-headline text-primary">StockPilot</h1>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground pt-4">
          <div>
            <p className="font-semibold text-foreground">Customer:</p>
            <p>{order.customer.name}</p>
            <p>{order.customer.contactNumber}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Invoice Date:</p>
            <p>{displayDate ? format(new Date(displayDate), 'PPP') : 'N/A'}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Due Date:</p>
            <p>{displayDueDate ? format(new Date(displayDueDate), 'PPP') : 'N/A'}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Payment Terms:</p>
            <p>{order.customer.paymentTerms || 'N/A'}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Payment Method:</p>
            <p>{order.paymentMethod}</p>
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
          Print Invoice
        </Button>
      </div>
    </Card>
  );
}


export default function SalesInvoicesPage() {
  const [invoiceToPrint, setInvoiceToPrint] = useState<Sale | null>(null);
  const { salesInvoices, loading, error, refetch } = useSalesInvoices();

  // Filter for sales that are candidates for invoicing or delivery
  const relevantSales = salesInvoices.filter((s: Sale) => ['Paid', 'Shipped', 'Delivered', 'Pending', 'Voided'].includes(s.status));

  const handlePrint = (sale: Sale) => {
    setInvoiceToPrint(sale);
  };

  if (invoiceToPrint) {
    return <SalesInvoicePrintView order={invoiceToPrint} onBack={() => setInvoiceToPrint(null)} />
  }

  return (
    <Card className="printable-area">
      <CardHeader className="non-printable">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales Invoice / Delivery</CardTitle>
            <CardDescription>
              View and print invoices or delivery receipts for your sales.
            </CardDescription>
          </div>
          <AddSalesInvoiceDialog onSuccess={refetch} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading sales invoices...</div>
          </div>
        ) : error ? (
          <div className="text-sm text-destructive py-8 text-center">
            Error loading sales invoices: {error}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><span className="sr-only">Expand</span></TableHead>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="non-printable"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            {relevantSales.length > 0 ? (
              relevantSales.map((sale: Sale) => (
                <InvoiceRow key={sale.id} sale={sale} onPrint={() => handlePrint(sale)} onSuccess={refetch} />
              ))
            ) : (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No invoices found.
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

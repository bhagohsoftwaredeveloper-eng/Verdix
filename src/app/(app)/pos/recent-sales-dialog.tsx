
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, ArrowLeft } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { format, subMinutes } from 'date-fns';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface RecentSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const MOCK_RECENT_SALES: Sale[] = [
    {
        id: 'sale_rc_1',
        customer: { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30' },
        date: subMinutes(new Date(), 5).toISOString(),
        items: [
            { product: { id: 'prod_1', name: 'Wireless Keyboard', price: 75.0, stock: 100, category: 'Elec', brand: 'Logi', reorderPoint: 10, avgDailySales: 5, sku: 'WK-P', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 1, price: 75.0 },
            { product: { id: 'prod_2', name: 'Ergonomic Mouse', price: 45.0, stock: 100, category: 'Elec', brand: 'MS', reorderPoint: 10, avgDailySales: 5, sku: 'EM-P', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 1, price: 45.0 },
        ],
        total: 120.00,
        paymentMethod: 'Cash',
        status: 'Paid'
    },
    {
        id: 'sale_rc_2',
        customer: { id: 'cust_2', name: 'Bob Smith', contactNumber: '09182223344', paymentTerms: 'COD' },
        date: subMinutes(new Date(), 15).toISOString(),
        items: [
            { product: { id: 'prod_3', name: '4K UHD Monitor', price: 350.0, stock: 100, category: 'Elec', brand: 'Dell', reorderPoint: 10, avgDailySales: 5, sku: '4KM-U', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 2, price: 350.0 },
        ],
        total: 700.00,
        paymentMethod: 'Credit Card',
        status: 'Paid'
    },
     {
        id: 'sale_rc_3',
        customer: { id: 'cust_3', name: 'Charlie Brown', contactNumber: '09193334455', paymentTerms: 'Net 15' },
        date: subMinutes(new Date(), 32).toISOString(),
        items: [
             { product: { id: 'prod_1', name: 'Wireless Keyboard', price: 75.0, stock: 100, category: 'Elec', brand: 'Logi', reorderPoint: 10, avgDailySales: 5, sku: 'WK-P', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 5, price: 75.0 },
        ],
        total: 375.00,
        paymentMethod: 'GCash',
        status: 'Paid'
    }
];


function ReceiptPrintView({ sale, onBack }: { sale: Sale; onBack: () => void }) {
    return (
        <div className="printable-area">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <Button variant="outline" size="icon" onClick={onBack} className="non-printable">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <CardTitle>Sale Receipt</CardTitle>
                        </div>
                        <CardDescription>Sale ID: {sale.id}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Logo className="size-7 text-primary" />
                        <h1 className="text-xl font-semibold font-headline text-primary">StockPilot</h1>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground pt-4">
                  <div>
                      <p className="font-semibold text-foreground">Customer:</p>
                      <p>{sale.customer.name}</p>
                  </div>
                  <div>
                      <p className="font-semibold text-foreground">Date:</p>
                      <p>{format(new Date(sale.date || new Date()), 'PPp')}</p>
                  </div>
              </div>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
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
                  <TableRow className="border-t-2 border-primary">
                      <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                      <TableCell className="text-right font-bold text-lg">₱{sale.total.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Thank you for your purchase!
              </div>
          </CardContent>
          <div className="flex justify-end mt-4 p-6 pt-0 non-printable">
              <Button onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
              </Button>
          </div>
        </div>
    );
}


export function RecentSalesDialog({
  isOpen,
  onOpenChange,
}: RecentSalesDialogProps) {
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (isOpen) {
        setIsLoading(true);
        setTimeout(() => {
            setRecentSales(MOCK_RECENT_SALES);
            setIsLoading(false);
        }, 500);
    }
  }, [isOpen]);
  
  const handlePrintReceipt = (sale: Sale) => {
    setSaleToPrint(sale);
  };
  
  const handleBackToList = () => {
    setSaleToPrint(null);
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSaleToPrint(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {saleToPrint ? (
            <ReceiptPrintView sale={saleToPrint} onBack={handleBackToList} />
        ) : (
        <>
            <DialogHeader>
            <DialogTitle>Recent Transactions</DialogTitle>
            <DialogDescription>
                A list of the 10 most recent sales.
            </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Sale ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading && (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Loading recent sales...
                    </TableCell>
                    </TableRow>
                )}
                {!isLoading && recentSales && recentSales.length > 0 ? (
                    recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                        <TableCell className="font-mono">{sale.id.substring(0, 7)}...</TableCell>
                        <TableCell>{sale.customer.name}</TableCell>
                        <TableCell>{format(new Date(sale.date || new Date()), 'p')}</TableCell>
                        <TableCell className="text-right">₱{sale.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintReceipt(sale)}
                            >
                            <Printer className="mr-2 h-4 w-4" />
                            Reprint
                            </Button>
                        </div>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    !isLoading && (
                        <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No recent sales found.
                        </TableCell>
                        </TableRow>
                    )
                )}
                </TableBody>
            </Table>
            </ScrollArea>
            <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
            </Button>
            </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}

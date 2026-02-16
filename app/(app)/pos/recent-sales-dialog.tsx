
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Printer, ArrowLeft, Package2 } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { format } from 'date-fns';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminAuthDialog } from './admin-auth-dialog';
import { usePrinter } from '@/lib/use-printer';
import { ReceiptGenerator } from '@/lib/receipt-generator';
import { useToast } from '@/hooks/use-toast';


interface RecentSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  printMode: 'browser' | 'escpos' | 'usb';
}


// ... (existing formatCurrency, ReceiptPrintView helper functions preserved)
const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ReceiptPrintView({ 
    sale, 
    onBack,
    onPrint 
}: { 
    sale: Sale; 
    onBack: () => void;
    onPrint: () => void;
}) {
    return (
        <div className="printable-area">
            <CardHeader className="pr-10">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                             <Button variant="outline" size="icon" onClick={onBack} className="non-printable shrink-0 print:hidden">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <CardTitle>Sale Receipt</CardTitle>
                        </div>
                        <CardDescription className="break-all">SO Number: {sale.orderNumber || sale.id}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-primary">
                        <Package2 className="h-6 w-6" />
                        <h1 className="text-xl font-semibold font-headline">StockPilot</h1>
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
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell>{item.product.unitOfMeasure}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₱{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">₱{formatCurrency(item.price * item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-primary">
                      <TableCell colSpan={4} className="text-right font-bold text-lg">Total</TableCell>
                      <TableCell className="text-right font-bold text-lg">₱{formatCurrency(sale.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Thank you for your purchase!
              </div>
          </CardContent>
          <div className="flex justify-end mt-4 p-6 pt-0 non-printable">
              <Button onClick={onPrint}>
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
  printMode
}: RecentSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'list'>('loading');
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [posSettings, setPosSettings] = useState<any>(null);
  const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
  const { toast } = useToast();
  const authSucceededRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
        authSucceededRef.current = false;
        setStep('loading');
        setIsLoading(true);
        setSaleToPrint(null);
        
        // Fetch settings first to determine step
        fetch(`/api/pos-settings?_t=${Date.now()}`, { cache: 'no-store' })
          .then(res => res.json())
          .then(result => {
             if (result.success) {
                 const settings = result.data;
                 setPosSettings(settings);
                 
                 if (settings.enableRecentSalesAuth) {
                     setStep('auth');
                 } else {
                     setStep('list');
                 }
            } else {
                setStep('list'); // Fallback
            }
          })
          .catch(err => {
              console.error(err);
              setStep('list');
          });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === 'list') {
        const fetchRecentSales = async () => {
            try {
                const response = await fetch(`/api/pos/recent-sales?_t=${Date.now()}`, { cache: 'no-store' });
                const result = await response.json();
                
                if (result.success) {
                    setRecentSales(result.data);
                } else {
                    console.error('Failed to fetch recent sales:', result.error);
                }
            } catch (error) {
                console.error('Error fetching recent sales:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecentSales();
        // Poll every 3 seconds to keep data real-time
        const interval = setInterval(fetchRecentSales, 3000);
        return () => clearInterval(interval);
    }
  }, [isOpen, step]);
  
  const handleAuthSuccess = () => {
      authSucceededRef.current = true;
      setStep('list');
  };

  const handleAuthClose = (open: boolean) => {
      if (!open && !authSucceededRef.current) {
          onOpenChange(false);
      }
      authSucceededRef.current = false;
  };

  const handlePrintReceiptAction = async (sale: Sale) => {
    if (printMode === 'browser') {
        try {
            const { printReactComponent } = await import('@/app/lib/print-utils');
            printReactComponent(
                <ReceiptPrintView 
                    sale={sale} 
                    onBack={() => {}} 
                    onPrint={() => {}} 
                />,
                '80mm'
            );
            return;
        } catch (e) {
            console.error('Browser print error:', e);
            window.print();
            return;
        }
    }

    if (!isConnected) {
        const success = await connect();
        if (!success) return;
    }

    try {
        const generator = new ReceiptGenerator();
        // Adapter to match expected items structure
        const receiptData = {
            items: sale.items.map(item => ({
                ...item.product,
                price: item.price,
                quantity: item.quantity,
                discount: 0
            })),
            totalDue: sale.total,
            change: 0,
            paymentMethod: sale.paymentMethod,
            orderNumber: String(sale.orderNumber || sale.id),
            customer: sale.customer
        };
        const bytes = generator.generateReceipt(receiptData);
        await print(bytes);
        toast({ title: "Re-printed", description: "Receipt sent to printer." });
    } catch (e) {
        console.error("Reprint error", e);
        toast({ title: "Print Failed", description: "Could not send data to printer.", variant: "destructive" });
    }
  };
  
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
    <>
    <Dialog open={isOpen && (step === 'list')} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {saleToPrint ? (
            <ReceiptPrintView 
                sale={saleToPrint} 
                onBack={handleBackToList} 
                onPrint={() => handlePrintReceiptAction(saleToPrint)}
            />
        ) : (
        <>
            <DialogHeader>
            <div className="flex items-center justify-between">
                <div>
                    <DialogTitle>Recent Transactions</DialogTitle>
                    <DialogDescription>
                        A list of the 20 most recent sales.
                    </DialogDescription>
                </div>

            </div>
            </DialogHeader>
            <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>SO Number</TableHead>
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
                        <TableCell className="font-mono">{sale.orderNumber ? sale.orderNumber : sale.id.substring(0, 7)}</TableCell>
                        <TableCell>{sale.customer.name}</TableCell>
                        <TableCell>{format(new Date(sale.date || new Date()), 'p')}</TableCell>
                        <TableCell className="text-right">₱{sale.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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

    <AdminAuthDialog
        isOpen={isOpen && step === 'auth'}
        onOpenChange={handleAuthClose}
        onSuccess={handleAuthSuccess}
        requiredCredentials={posSettings?.enableRecentSalesAuth ? {
            username: posSettings.recentSalesAuthUsername,
            password: posSettings.recentSalesAuthPassword
        } : null}
        title="Recent Sales Authorization"
        description="Enter authorized credentials to view recent sales."
      />
    </>
  );
}


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
import { ReceiptView } from './receipt-view';
import { getApiUrl } from '@/lib/api-config';
import { SystemSettings } from '@/lib/types';


interface RecentSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
  settings?: SystemSettings | null;
}


// ... (existing formatCurrency, ReceiptPrintView helper functions preserved)
const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function mapSaleToReceiptDetails(sale: Sale) {
    const mappedItems = sale.items.map(item => {
        const gross = item.price * item.quantity;
        const discountPercent = gross > 0 ? ((item.discount || 0) / gross) * 100 : 0;
        return {
            ...item.product,
            price: item.price,
            quantity: item.quantity,
            discount: discountPercent,
            name: item.product.name
        };
    });

    const vatableGross = mappedItems.reduce((acc, item) => {
        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
        const taxType = item.taxType;
        return taxType === 'VAT' ? acc + netItemTotal : acc;
    }, 0);

    const vatableSales = vatableGross / 1.12;
    const vatAmountResult = vatableGross - vatableSales;

    const vatExemptSales = mappedItems.reduce((acc, item) => {
        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
        return item.taxType === 'VAT_EXEMPT' ? acc + netItemTotal : acc;
    }, 0);

    const zeroRatedSales = mappedItems.reduce((acc, item) => {
        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
        return item.taxType === 'ZERO_RATED' ? acc + netItemTotal : acc;
    }, 0);

    const nonVatSales = mappedItems.reduce((acc, item) => {
        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
        return item.taxType === 'NON_VAT' ? acc + netItemTotal : acc;
    }, 0);

    return {
        items: mappedItems,
        customer: sale.customer,
        totalDue: sale.total,
        change: sale.change || 0,
        paymentMethod: sale.paymentMethod,
        orderNumber: sale.orderNumber ? String(sale.orderNumber) : sale.id, // Ensure string
        amountTendered: sale.amountTendered || sale.total,
        transactionDate: sale.date ? new Date(sale.date) : new Date(),
        cashierName: sale.cashierName || sale.salesPerson, // Or fetch from sale.salesPersonId
        pointsEarned: sale.pointsEarned || 0,
        terminalMin: sale.terminalMin,
        terminalSerialNumber: sale.terminalSerialNumber,
        pointsUsedCount: sale.pointsUsedCount || 0,
        pointsBalance: sale.pointsBalance ?? 0,
        paymentReference: sale.paymentReference,
        taxBreakdown: {
            vatableSales,
            vatAmount: vatAmountResult,
            vatExemptSales,
            zeroRatedSales,
            nonVatSales
        }
    };
}

function ReceiptPrintView({ 
    sale, 
    onBack,
    onPrint,
    settings
}: { 
    sale: Sale; 
    onBack: () => void;
    onPrint: () => void;
    settings?: SystemSettings | null;
}) {
    // Map Sale to ReceiptViewProps['saleDetails']
    const saleDetails = mapSaleToReceiptDetails(sale);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 non-printable">
                <Button variant="outline" size="sm" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to List
                </Button>
                <Button onClick={onPrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Receipt
                </Button>
            </div>
            
            <div className="printable-area bg-white p-4 shadow-sm mx-auto">
                 <ReceiptView saleDetails={saleDetails} settings={settings} />
            </div>
        </div>
    );
}

export function RecentSalesDialog({
  isOpen,
  onOpenChange,
  printMode,
  settings: initialSettings
}: RecentSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'list'>('loading');
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [posSettings, setPosSettings] = useState<SystemSettings | null>(initialSettings || null);
  const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
  const { toast } = useToast();
  const authSucceededRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
        authSucceededRef.current = false;
        setStep('loading');
        setIsLoading(true);
        setSaleToPrint(null);
        
        if (initialSettings) {
            setPosSettings(initialSettings);
            if (initialSettings.enableRecentSalesAuth) {
                setStep('auth');
            } else {
                setStep('list');
            }
            return;
        }

        // Fetch settings if not provided
        fetch(getApiUrl(`/pos-settings?_t=${Date.now()}`), { cache: 'no-store' })
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
                const response = await fetch(getApiUrl(`/pos/recent-sales?_t=${Date.now()}`), { cache: 'no-store' });
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
                    settings={posSettings}
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
            ...mapSaleToReceiptDetails(sale),
            orderNumber: String(sale.orderNumber || sale.id),
        };
        const bytes = generator.generateReceipt(receiptData, posSettings);
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
                settings={posSettings}
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
                    <TableHead>Payment</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading && (
                    <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        Loading recent sales...
                    </TableCell>
                    </TableRow>
                )}
                {!isLoading && recentSales && recentSales.length > 0 ? (
                    recentSales.map((sale: any) => (
                    <TableRow key={sale.id}>
                        <TableCell className="font-mono">{sale.orderNumber ? sale.orderNumber : sale.id.substring(0, 7)}</TableCell>
                        <TableCell>{sale.customer.name || 'Walk-in'}</TableCell>
                        <TableCell>{format(new Date(sale.date || new Date()), 'p')}</TableCell>
                        <TableCell>{sale.paymentMethod || '-'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{sale.paymentReference || '-'}</TableCell>
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
                        <TableCell colSpan={7} className="h-24 text-center">
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

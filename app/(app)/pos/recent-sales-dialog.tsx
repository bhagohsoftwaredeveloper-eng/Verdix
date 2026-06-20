
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
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
import { Printer, ArrowLeft, Package2, User, CreditCard, Hash, Calendar, ChevronRight, Clock, ShoppingBag } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { format } from 'date-fns';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminAuthDialog } from './admin-auth/AdminAuthDialog';
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
        payments: sale.payments,
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

function SaleDetailView({
    sale,
    onReprint,
}: {
    sale: any;
    onReprint: () => void;
}) {
    const items = sale.items || [];
    const gross = items.reduce((acc: number, it: any) => acc + it.price * it.quantity, 0);
    const totalDiscount = items.reduce((acc: number, it: any) => acc + (it.discount || 0), 0);
    const totalQty = items.reduce((acc: number, it: any) => acc + it.quantity, 0);
    const tendered = sale.amountTendered ?? sale.total;
    const change = sale.change ?? Math.max(0, tendered - sale.total);

    return (
        <div className="flex h-full flex-col">
            {/* Top action bar */}
            <div className="flex items-center justify-between gap-2 border-b pb-3 shrink-0">
                <h2 className="text-sm font-semibold">Transaction Details</h2>
                <Button size="sm" className="gap-1.5" onClick={onReprint}>
                    <Printer className="h-4 w-4" />
                    Reprint Receipt
                </Button>
            </div>

            {/* Header summary */}
            <div className="mt-4 rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SO Number</p>
                            <p className="truncate font-mono text-lg font-bold leading-tight">{sale.orderNumber || sale.id?.substring(0, 8)}</p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
                        <p className="font-mono text-2xl font-black tabular-nums text-primary leading-tight">₱{formatCurrency(sale.total)}</p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                    {[
                        { icon: User, label: 'Customer', value: sale.customer?.name || 'Walk-in' },
                        { icon: Calendar, label: 'Date & Time', value: format(new Date(sale.date || new Date()), 'MMM d, yyyy • p') },
                        { icon: CreditCard, label: 'Payment', value: sale.paymentMethod || '-' },
                        { icon: User, label: 'Cashier', value: sale.cashierName || sale.salesPerson || '-' },
                        { icon: Hash, label: 'Reference', value: sale.paymentReference || '-' },
                        { icon: Clock, label: 'Points Earned', value: String(sale.pointsEarned || 0) },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-start gap-2 min-w-0">
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{label}</p>
                                <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Line items */}
            <div className="mt-4 flex items-center gap-2 shrink-0">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Products</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {items.length} {items.length === 1 ? 'line' : 'lines'} · {totalQty} {totalQty === 1 ? 'pc' : 'pcs'}
                </span>
            </div>

            <div className="mt-2 flex-1 overflow-hidden rounded-xl border">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-semibold uppercase tracking-wide">Product</TableHead>
                                <TableHead className="text-center text-xs font-semibold uppercase tracking-wide">Qty</TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Unit Price</TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Disc</TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? items.map((it: any, idx: number) => {
                                const lineGross = it.price * it.quantity;
                                const lineTotal = lineGross - (it.discount || 0);
                                return (
                                    <TableRow key={idx} className="border-b-border/50">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm leading-tight">{it.product?.name || it.name}</span>
                                                {(it.product?.sku || it.product?.unitOfMeasure) && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {it.product?.sku ? `${it.product.sku}` : ''}
                                                        {it.product?.sku && it.product?.unitOfMeasure ? ' · ' : ''}
                                                        {it.product?.unitOfMeasure || ''}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-sm">{it.quantity}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">₱{formatCurrency(it.price)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm text-rose-600">
                                            {it.discount ? `−₱${formatCurrency(it.discount)}` : '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-semibold">₱{formatCurrency(lineTotal)}</TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No product lines on this transaction.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2 rounded-xl border bg-muted/30 p-4 shrink-0">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono tabular-nums">₱{formatCurrency(gross)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono tabular-nums text-rose-600">−₱{formatCurrency(totalDiscount)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                    <span className="text-sm font-bold uppercase tracking-wide">Total</span>
                    <span className="font-mono text-lg font-black tabular-nums text-primary">₱{formatCurrency(sale.total)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Tendered</span>
                    <span className="font-mono tabular-nums">₱{formatCurrency(tendered)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-mono tabular-nums">₱{formatCurrency(change)}</span>
                </div>
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
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
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
        setSelectedSale(null);
        
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
                if (!response.ok) throw new Error(`API error ${response.status}`);
                const result = await response.json();
                
                if (result.success) {
                    setRecentSales(result.data);
                    // Auto-select the most recent sale so the detail panel isn't empty
                    setSelectedSale(prev => prev || result.data[0] || null);
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
      setSelectedSale(null);
    }
    onOpenChange(open);
  }

  return (
    <>
    <Sheet open={isOpen && (step === 'list')} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-4xl w-full flex flex-col">
        {saleToPrint ? (
            <ReceiptPrintView
                sale={saleToPrint}
                onBack={handleBackToList}
                onPrint={() => handlePrintReceiptAction(saleToPrint)}
                settings={posSettings}
            />
        ) : (
        <>
            <SheetHeader className="shrink-0">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-5 w-5" />
                </div>
                <div>
                    <SheetTitle>Recent Transactions</SheetTitle>
                    <SheetDescription>
                        Select a transaction on the left to view its products
                    </SheetDescription>
                </div>
            </div>
            </SheetHeader>

            <div className="mt-4 flex flex-1 gap-4 overflow-hidden">
                {/* LEFT: transactions list */}
                <div className="flex w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 shrink-0">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transactions</span>
                        {!isLoading && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{recentSales.length}</span>}
                    </div>
                    <ScrollArea className="flex-1">
                        {isLoading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Loading recent sales...</div>
                        ) : recentSales && recentSales.length > 0 ? (
                            recentSales.map((sale: any) => {
                                const isActive = selectedSale?.id === sale.id;
                                return (
                                    <button
                                        key={sale.id}
                                        onClick={() => setSelectedSale(sale)}
                                        className={`w-full border-b border-border/50 px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent hover:bg-muted/50'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate font-mono text-sm font-semibold">{sale.orderNumber ? sale.orderNumber : sale.id.substring(0, 7)}</span>
                                            <span className="shrink-0 font-mono text-sm font-bold">₱{sale.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                            <span className="truncate">{sale.customer?.name || 'Walk-in'}</span>
                                            <span className="shrink-0">{format(new Date(sale.date || new Date()), 'p')}</span>
                                        </div>
                                        <div className="mt-1">
                                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                {sale.paymentMethod || '-'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">No recent sales found.</div>
                        )}
                    </ScrollArea>
                </div>

                {/* RIGHT: selected transaction contents */}
                <div className="flex-1 overflow-hidden">
                    {selectedSale ? (
                        <SaleDetailView
                            sale={selectedSale}
                            onReprint={() => handlePrintReceipt(selectedSale)}
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed text-center text-muted-foreground">
                            <Clock className="mb-2 h-10 w-10 opacity-40" />
                            <p className="text-sm font-medium">No transaction selected</p>
                            <p className="text-xs">Pick a transaction from the list to see its products.</p>
                        </div>
                    )}
                </div>
            </div>

            <SheetFooter className="shrink-0 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
            </Button>
            </SheetFooter>
        </>
        )}
      </SheetContent>
    </Sheet>

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


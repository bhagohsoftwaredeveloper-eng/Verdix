
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo, ArrowLeft, Search, AlertTriangle, Clock, User, Calendar, CreditCard, ShoppingBag, Loader2, ChevronRight, Printer, CheckCircle2, Minus, Plus } from 'lucide-react';
import type { Sale, SaleItem } from '@/lib/types';
import { format, subMinutes } from 'date-fns';
import { AdminAuthDialog } from './admin-auth-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { usePrinter } from '@/lib/use-printer';
import { CreditSlipGenerator, CreditSlipData } from '@/lib/credit-slip-generator';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { useReactToPrint } from 'react-to-print';
import { CreditSlipView } from './credit-slip-view';
import { formatQuantity } from '@/lib/utils';

interface ReturnSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUser?: any;
  terminalId?: string;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
}

const peso = (n: number) => `₱${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Compact selectable row used in the "recent transactions" quick-pick list
function TransactionPickRow({ sale, onPick }: { sale: any, onPick: (s: any) => void }) {
    return (
        <button
            onClick={() => onPick(sale)}
            className="group flex w-full items-center gap-3 border-b border-border/50 px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm font-semibold">{sale.orderNumber ? sale.orderNumber : sale.id?.substring(0, 7)}</span>
                    <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{sale.paymentMethod || '-'}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{sale.customer?.name || 'Walk-in'}</span>
                    <span>·</span>
                    <span className="shrink-0">{format(new Date(sale.date || new Date()), 'MMM d, p')}</span>
                </div>
            </div>
            <span className="shrink-0 font-mono text-sm font-bold">{peso(sale.total)}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
    );
}

const MOCK_RETURNABLE_SALES: Sale[] = [
    {
        id: 'sale_rc_1',
        customer: { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30' },
        date: subMinutes(new Date(), 5).toISOString(),
        items: [
            { product: { id: 'prod_1', name: 'Wireless Keyboard', description: 'Mock Description', price: 75.0, stock: 100, category: 'Elec', brand: 'Logi', reorderPoint: 10, avgDailySales: 5, sku: 'WK-P', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 1, price: 75.0 },
            { product: { id: 'prod_2', name: 'Ergonomic Mouse', description: 'Mock Description', price: 45.0, stock: 100, category: 'Elec', brand: 'MS', reorderPoint: 10, avgDailySales: 5, sku: 'EM-P', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 1, price: 45.0 },
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
            { product: { id: 'prod_3', name: '4K UHD Monitor', description: 'Mock Description', price: 350.0, stock: 100, category: 'Elec', brand: 'Dell', reorderPoint: 10, avgDailySales: 5, sku: '4KM-U', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 2, price: 350.0 },
        ],
        total: 700.00,
        paymentMethod: 'Credit Card',
        status: 'Paid'
    },
];


function SelectItemsView({ sale, onReturnItems, onBack }: { sale: Sale, onReturnItems: (items: SaleItem[]) => void, onBack: () => void }) {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

    const handleItemToggle = (item: SaleItem) => {
        const itemId = item.product.id;
        const newSelected = new Set(selectedItems);
        
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
            // Cleanup quantity state
            const newQuantities = { ...returnQuantities };
            delete newQuantities[itemId];
            setReturnQuantities(newQuantities);
        } else {
            newSelected.add(itemId);
            // Default to max quantity
            setReturnQuantities(prev => ({ ...prev, [itemId]: item.quantity }));
        }
        
        setSelectedItems(newSelected);
    };

    const handleQuantityChange = (item: SaleItem, value: string) => {
        const qty = parseFloat(value);
        if (isNaN(qty) || qty <= 0) return;
        
        // Cap at sold quantity
        const validQty = Math.min(qty, item.quantity);
        setReturnQuantities(prev => ({ ...prev, [item.product.id]: validQty }));
    };

    const handleConfirmReturn = () => {
        const itemsToReturn = sale.items
            .filter(item => selectedItems.has(item.product.id))
            .map(item => ({
                ...item,
                quantity: returnQuantities[item.product.id] || item.quantity
            }));
        
        onReturnItems(itemsToReturn);
    };

    const allSelected = sale.items.length > 0 && selectedItems.size === sale.items.length;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedItems(new Set());
            setReturnQuantities({});
        } else {
            const all = new Set<string>();
            const q: Record<string, number> = {};
            sale.items.forEach(it => { all.add(it.product.id); q[it.product.id] = it.quantity; });
            setSelectedItems(all);
            setReturnQuantities(q);
        }
    };

    const step = (item: SaleItem, delta: number) => {
        const current = returnQuantities[item.product.id] || 1;
        const next = Math.min(item.quantity, Math.max(1, current + delta));
        setReturnQuantities(prev => ({ ...prev, [item.product.id]: next }));
    };

    const creditTotal = sale.items.reduce((sum, item) => {
        if (!selectedItems.has(item.product.id)) return sum;
        const qty = returnQuantities[item.product.id] || item.quantity;
        return sum + item.price * qty;
    }, 0);
    const totalReturnQty = sale.items.reduce((sum, item) => selectedItems.has(item.product.id) ? sum + (returnQuantities[item.product.id] || item.quantity) : sum, 0);

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 border-b pb-3 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold">Select Items to Return</h2>
                    <p className="truncate text-xs text-muted-foreground">SO Number: <span className="font-mono">{sale.orderNumber || sale.id}</span></p>
                </div>
            </div>

            {/* Select-all bar */}
            <div className="mt-3 flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 shrink-0">
                <button type="button" onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox checked={allSelected} />
                    Select all items
                </button>
                <span className="text-xs text-muted-foreground">{selectedItems.size} of {sale.items.length} selected</span>
            </div>

            {/* Item list */}
            <div className="mt-3 flex-1 overflow-hidden rounded-xl border">
                <ScrollArea className="h-full">
                    {sale.items.map((item, index) => {
                        const checked = selectedItems.has(item.product.id);
                        const rQty = returnQuantities[item.product.id] || item.quantity;
                        return (
                            <div
                                key={index}
                                className={`flex items-center gap-3 border-b border-border/50 px-3 py-3 transition-colors ${checked ? 'bg-amber-50/60 dark:bg-amber-950/20' : 'hover:bg-muted/40'}`}
                            >
                                <Checkbox checked={checked} onCheckedChange={() => handleItemToggle(item)} />
                                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleItemToggle(item)}>
                                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Sold: {formatQuantity(item.quantity)} {item.product.unitOfMeasure || ''} · {peso(item.price)} ea
                                    </p>
                                </div>
                                {checked ? (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={rQty <= 1} onClick={() => step(item, -1)}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <Input
                                            type="number"
                                            min="1"
                                            max={item.quantity}
                                            className="h-7 w-12 px-1 text-center font-mono"
                                            value={returnQuantities[item.product.id] || ''}
                                            onChange={(e) => handleQuantityChange(item, e.target.value)}
                                        />
                                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={rQty >= item.quantity} onClick={() => step(item, 1)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="shrink-0 text-xs text-muted-foreground">Not returning</span>
                                )}
                                <div className="w-20 shrink-0 text-right font-mono text-sm font-semibold">
                                    {checked ? peso(item.price * rQty) : '—'}
                                </div>
                            </div>
                        );
                    })}
                </ScrollArea>
            </div>

            {/* Live credit total */}
            <div className="mt-3 flex items-center justify-between rounded-xl border bg-gradient-to-br from-amber-500/10 to-transparent px-4 py-3 shrink-0">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Merchandise Credit</p>
                    <p className="text-xs text-muted-foreground">{totalReturnQty} {totalReturnQty === 1 ? 'item' : 'items'} to return</p>
                </div>
                <p className="font-mono text-2xl font-black tabular-nums text-amber-600">{peso(creditTotal)}</p>
            </div>

            <SheetFooter className="mt-4 shrink-0">
                <Button variant="outline" onClick={onBack}>
                    Cancel
                </Button>
                <Button
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={selectedItems.size === 0}
                    onClick={handleConfirmReturn}
                >
                    <Undo className="mr-2 h-4 w-4" />
                    Issue Credit ({selectedItems.size})
                </Button>
            </SheetFooter>
        </div>
    );
}



const ReturnSuccessView = ({ 
    returnedTotal, 
    saleId, 
    onClose,
    onPrint
}: { 
    returnedTotal: number, 
    saleId: string, 
    onClose: () => void,
    onPrint?: () => void
}) => {
    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                    <CheckCircle2 className="h-9 w-9 text-green-600" />
                </div>
                <h2 className="mt-4 text-xl font-bold">Return Successful</h2>
                <p className="mt-1 text-sm text-muted-foreground">Items have been returned to inventory.</p>

                <div className="mt-6 w-full max-w-xs rounded-2xl border bg-gradient-to-br from-amber-500/10 to-transparent p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Merchandise Credit Issued
                    </p>
                    <p className="mt-1 font-mono text-4xl font-black tabular-nums text-amber-600">
                        {peso(returnedTotal)}
                    </p>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                    Reference: <span className="font-mono font-medium text-foreground">{saleId}</span>
                </p>
            </div>

            <SheetFooter className="shrink-0 flex-col gap-2 sm:flex-row">
                <Button className="w-full sm:w-auto" variant="outline" onClick={onPrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Credit Slip
                </Button>
                <Button className="w-full sm:w-auto" onClick={onClose}>
                    Close
                </Button>
            </SheetFooter>
        </div>
    );
};

export function ReturnSalesDialog({
  isOpen,
  onOpenChange,
  currentUser,
  terminalId,
  printMode
}: ReturnSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'input_so' | 'select_items' | 'success'>('loading');
  const [sales, setSales] = useState<Sale[]>([]); // Kept for type safety if needed, but not used for list
  const [isLoading, setIsLoading] = useState(false);
  const [soNumber, setSoNumber] = useState('');
  const [searchError, setSearchError] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [itemsToReturn, setItemsToReturn] = useState<SaleItem[]>([]);
  const [returnedItems, setReturnedItems] = useState<SaleItem[]>([]);
  const [posSettings, setPosSettings] = useState<any>(null);
  const [returnedTotal, setReturnedTotal] = useState(0);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
  const { toast } = useToast();
  const authSucceededRef = useRef(false);
  const creditSlipRef = useRef<HTMLDivElement>(null);

  const handleBrowserPrint = useReactToPrint({
      contentRef: creditSlipRef,
      documentTitle: `CreditSlip-${new Date().getTime()}`,
      pageStyle: `
          @page {
              size: 58mm auto;
              margin: 0;
          }
          @media print {
              body {
                  -webkit-print-color-adjust: exact;
              }
          }
      `
  });

  useEffect(() => {
    if (isOpen) {
        authSucceededRef.current = false;
        setStep('loading');
        setIsLoading(false);
        setSoNumber('');
        setSearchError('');
        setSelectedSale(null);
        setReturnedTotal(0);
        setReturnedItems([]);
        
        // Fetch settings first to determine step
        fetch(getApiUrl(`/pos-settings?_t=${Date.now()}`), { cache: 'no-store' })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
                 const settings = result.data;
                 setPosSettings(settings);
                 
                 if (settings.enableReturnAuth) {
                     setStep('auth');
                 } else {
                     setStep('input_so');
                 }
            } else {
                setStep('input_so'); // Fallback
            }
          })
          .catch(err => {
              console.error(err);
              setStep('input_so');
          });
    }
  }, [isOpen]);
  
  // Load recent transactions for the quick-pick list once we reach the search step
  useEffect(() => {
    if (isOpen && step === 'input_so') {
        setIsRecentLoading(true);
        fetch(getApiUrl(`/pos/recent-sales?_t=${Date.now()}`), { cache: 'no-store' })
          .then(res => res.json())
          .then(result => { if (result.success) setRecentSales(result.data || []); })
          .catch(() => {})
          .finally(() => setIsRecentLoading(false));
    }
  }, [isOpen, step]);

  const handlePickSale = (sale: Sale) => {
      setSelectedSale(sale);
      setSearchError('');
      setStep('select_items');
  };

  const handleAuthSuccess = () => {
      authSucceededRef.current = true;
      setStep('input_so');
  };

  const handleAuthClose = (open: boolean) => {
      // If auth dialog is closed without success, close the whole return dialog
      if (!open && !authSucceededRef.current) {
          onOpenChange(false);
      }
      authSucceededRef.current = false;
  };

  const handleSearchSO = async () => {
      const term = soNumber.trim();
      if (!term) return;
      
      setIsLoading(true);
      setSearchError('');
      console.log('ReturnSalesDialog: Searching for SO:', term);
      
      try {
          const response = await fetch(getApiUrl(`/pos/recent-sales?query=${encodeURIComponent(term)}`));
          if (!response.ok) throw new Error(`API error ${response.status}`);
          const result = await response.json();
          console.log('ReturnSalesDialog: Search result:', result);
          
          if (result.success && result.data && result.data.length > 0) {
              // Find exact match preferred, or take first
              const found = result.data.find((s: any) => String(s.orderNumber) === term || s.id === term) || result.data[0];
              console.log('ReturnSalesDialog: Found sale:', found);
              setSelectedSale(found);
              setStep('select_items');
          } else {
              console.warn('ReturnSalesDialog: No matching transaction found.');
              setSearchError('Transaction not found. Please check the SO Number.');
          }
      } catch (err) {
          console.error('ReturnSalesDialog: Search error', err);
          setSearchError('Error searching transaction.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleReturnItems = async (items: SaleItem[]) => {
      if (selectedSale && items.length > 0) {
          setIsLoading(true);
          try {
              const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              
              const response = await fetch(getApiUrl('/sales/returns'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      saleId: selectedSale.id,
                      items: items.map(item => ({
                          productId: item.product.id,
                          productName: item.product.name,
                          quantity: item.quantity,
                          price: item.price
                      })),
                      terminalId: terminalId || posSettings?.terminalId, 
                      userId: currentUser?.uid || currentUser?.id || null,
                      reason: 'Merchandise Credit',
                      totalAmount
                  })
              });

              const result = await response.json();
              if (result.success) {
                  setReturnedTotal(totalAmount);
                  setReturnedItems(items);
                  setStep('success');
              } else {
                  setSearchError(result.error || 'Failed to process return');
              }
          } catch (err) {
              console.error('Error processing return:', err);
              setSearchError('Error processing return. Please try again.');
          } finally {
              setIsLoading(false);
          }
      }
  };

  const handleBackToSearch = () => {
      setStep('input_so');
      setSelectedSale(null);
      setSoNumber('');
  };

  const handleCloseSuccess = () => {
      onOpenChange(false);
  }

  const handlePrintCredit = async () => {
      if (!selectedSale || returnedItems.length === 0) return;

      const now = new Date();
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 30);
      const creditSlipId = `MC-${selectedSale.orderNumber || selectedSale.id.slice(-6)}-${format(now, 'yyMMddHHmm')}`.toUpperCase();

      if (printMode === 'browser') {
           handleBrowserPrint();
           return;
      }

      if (!isConnected) {
          const success = await connect();
          if (!success) return;
      }

      try {
          const generator = new CreditSlipGenerator();
          const slipData: CreditSlipData = {
              creditSlipId,
              originalSoNumber: String(selectedSale.orderNumber || selectedSale.id),
              customerName: selectedSale.customer?.name || 'Walk-in Customer',
              date: now.toISOString(),
              expiryDate: expiryDate.toISOString(),
              cashierName: currentUser?.name || currentUser?.displayName || currentUser?.username || 'Cashier',
              items: returnedItems.map(item => ({
                  name: item.product.name,
                  quantity: item.quantity,
                  unitOfMeasure: item.product.unitOfMeasure,
                  price: item.price,
                  total: item.quantity * item.price
              })),
              totalAmount: returnedTotal,
              businessSettings: {
                   businessName: posSettings?.businessName,
                   address: posSettings?.address,
                   contactNumber: posSettings?.contactNumber,
                   tin: posSettings?.tin,
                   minNumber: posSettings?.minNumber,
                   serialNumber: posSettings?.serialNumber
              }
          };

          const bytes = generator.generate(slipData);
          await print(bytes);
          toast({ title: "Success", description: "Credit slip sent to printer." });
      } catch (err) {
          console.error("Print error", err);
          toast({ title: "Print Failed", description: "Could not send data to printer.", variant: "destructive" });
      }
  }

  return (
    <>
      <Sheet open={isOpen && (step === 'input_so' || step === 'select_items' || step === 'success')} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-xl w-full flex flex-col">
          {step === 'success' ? (
              <ReturnSuccessView
                returnedTotal={returnedTotal}
                saleId={String(selectedSale?.orderNumber || selectedSale?.id || '')}
                onClose={handleCloseSuccess}
                onPrint={handlePrintCredit}
              />
          ) : step === 'select_items' && selectedSale ? (
            <SelectItemsView
                sale={selectedSale}
                onReturnItems={handleReturnItems}
                onBack={handleBackToSearch}
            />
          ) : (
            <div className="flex h-full flex-col">
              <SheetHeader className="shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950">
                        <Undo className="h-5 w-5" />
                    </div>
                    <div>
                        <SheetTitle>Merchandise Credit</SheetTitle>
                        <SheetDescription>Search by SO number or pick a recent transaction</SheetDescription>
                    </div>
                </div>
              </SheetHeader>

              <div className="mt-4 shrink-0">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SO Number</label>
                  <div className="mt-1.5 flex gap-2">
                      <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                              className="h-11 pl-9"
                              placeholder="Enter SO Number (e.g. 10001)"
                              value={soNumber}
                              onChange={(e) => setSoNumber(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSearchSO()}
                              autoFocus
                          />
                      </div>
                      <Button className="h-11" onClick={handleSearchSO} disabled={isLoading || !soNumber.trim()}>
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                      </Button>
                  </div>
                  {searchError && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4" /> {searchError}
                      </p>
                  )}
              </div>

              <div className="mt-5 flex items-center gap-2 shrink-0">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Recent Transactions</span>
              </div>
              <div className="mt-2 flex-1 overflow-hidden rounded-xl border">
                  <ScrollArea className="h-full">
                      {isRecentLoading ? (
                          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                          </div>
                      ) : recentSales.length > 0 ? (
                          recentSales.map((sale: any) => (
                              <TransactionPickRow key={sale.id} sale={sale} onPick={handlePickSale} />
                          ))
                      ) : (
                          <div className="p-6 text-center text-sm text-muted-foreground">No recent transactions.</div>
                      )}
                  </ScrollArea>
              </div>

              <SheetFooter className="mt-4 shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      <AdminAuthDialog
        isOpen={isOpen && step === 'auth'}
        onOpenChange={handleAuthClose}
        onSuccess={handleAuthSuccess}
        requiredCredentials={posSettings?.enableReturnAuth ? {
            username: posSettings.returnAuthUsername,
            password: posSettings.returnAuthPassword
        } : null}
        title="Return Authorization"
        description="Enter authorized credentials to access return functions."
      />
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          {selectedSale && returnedItems.length > 0 && (
              <CreditSlipView
                  ref={creditSlipRef}
                  creditDetails={{
                      creditSlipId: `MC-${selectedSale.orderNumber || selectedSale.id.slice(-6)}-${format(new Date(), 'yyMMddHHmm')}`.toUpperCase(),
                      originalSoNumber: String(selectedSale.orderNumber || selectedSale.id),
                      customerName: selectedSale.customer?.name || 'Walk-in Customer',
                      date: new Date().toISOString(),
                      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                      cashierName: currentUser?.name || currentUser?.displayName || currentUser?.username || 'Cashier',
                      items: returnedItems,
                      totalAmount: returnedTotal
                  }}
                  settings={posSettings}
              />
          )}
      </div>
    </>
  );
}

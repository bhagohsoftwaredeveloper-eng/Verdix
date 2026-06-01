
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
import { Ban, ArrowLeft, Search, AlertTriangle, Clock, User, Calendar, CreditCard, ShoppingBag, Loader2, ChevronRight } from 'lucide-react';
import type { Sale, SaleItem } from '@/lib/types';
import { format, subMinutes } from 'date-fns';
import { formatQuantity } from '@/lib/utils';
import { AdminAuthDialog } from './admin-auth-dialog';
import { getApiUrl } from '@/lib/api-config';
import { usePrinter } from '@/lib/use-printer';
import { VoidSlipGenerator } from '@/lib/void-slip-generator';

interface VoidSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const peso = (n: number) => `₱${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;




function ConfirmVoidView({ sale, onVoidTransaction, onBack, isVoiding, voidError }: { sale: Sale, onVoidTransaction: () => void, onBack: () => void, isVoiding: boolean, voidError?: string }) {
    const itemCount = sale.items.reduce((a, i) => a + i.quantity, 0);
    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 border-b pb-3 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} disabled={isVoiding}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-base font-semibold">Confirm Void</h2>
                    <p className="text-xs text-muted-foreground">Review the transaction before voiding</p>
                </div>
            </div>

            {/* Warning banner */}
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 shrink-0">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="text-sm">
                    <p className="font-semibold">This voids the entire transaction.</p>
                    <p className="text-rose-600/80 dark:text-rose-300/70">Stock for all items will be restored. This action cannot be undone.</p>
                </div>
            </div>

            {/* Summary card */}
            <div className="mt-4 rounded-xl border bg-gradient-to-br from-rose-500/5 to-transparent p-4 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SO Number</p>
                        <p className="truncate font-mono text-lg font-bold leading-tight">{sale.orderNumber || sale.id}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
                        <p className="font-mono text-xl font-black tabular-nums text-rose-600 leading-tight">{peso(sale.total)}</p>
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {[
                        { icon: User, label: 'Customer', value: sale.customer?.name || 'Walk-in' },
                        { icon: CreditCard, label: 'Payment', value: sale.paymentMethod || '-' },
                        { icon: Calendar, label: 'Date', value: format(new Date(sale.date || new Date()), 'MMM d, yyyy • p') },
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

            {/* Items */}
            <div className="mt-4 flex items-center gap-2 shrink-0">
                <ShoppingBag className="h-4 w-4 text-rose-600" />
                <h3 className="text-sm font-semibold">Items</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{sale.items.length} {sale.items.length === 1 ? 'line' : 'lines'} · {itemCount} pcs</span>
            </div>
            <div className="mt-2 flex-1 overflow-hidden rounded-xl border">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-semibold uppercase tracking-wide">Product</TableHead>
                                <TableHead className="text-center text-xs font-semibold uppercase tracking-wide">Qty</TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Price</TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sale.items.map((item, index) => (
                                <TableRow key={index} className="border-b-border/50">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm leading-tight">{item.product.name}</span>
                                            {item.product.unitOfMeasure && <span className="text-[11px] text-muted-foreground">{item.product.unitOfMeasure}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-sm">{formatQuantity(item.quantity)}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">{peso(item.price)}</TableCell>
                                    <TableCell className="text-right font-mono text-sm font-semibold">{peso(item.price * item.quantity)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>

            {voidError && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive shrink-0">
                    <AlertTriangle className="h-4 w-4" /> {voidError}
                </p>
            )}

            <SheetFooter className="mt-4 shrink-0">
                <Button variant="outline" onClick={onBack} disabled={isVoiding}>
                    Cancel
                </Button>
                <Button variant="destructive" onClick={onVoidTransaction} disabled={isVoiding}>
                    {isVoiding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                    {isVoiding ? 'Voiding...' : 'Void Transaction'}
                </Button>
            </SheetFooter>
        </div>
    );
}

// Compact selectable row used in the "recent transactions" quick-pick lists
function TransactionPickRow({ sale, onPick, accent = 'primary' }: { sale: any, onPick: (s: any) => void, accent?: 'primary' | 'rose' }) {
    const hover = accent === 'rose' ? 'hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'hover:bg-primary/5';
    return (
        <button
            onClick={() => onPick(sale)}
            className={`group flex w-full items-center gap-3 border-b border-border/50 px-3 py-2.5 text-left transition-colors ${hover}`}
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


export function VoidSalesDialog({
  isOpen,
  onOpenChange,
}: VoidSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'input_so' | 'select_items'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [soNumber, setSoNumber] = useState('');
  const [searchError, setSearchError] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [posSettings, setPosSettings] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const authSucceededRef = useRef(false);

  // Settings are fetched fresh each time the dialog opens (see useEffect below)
  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
        authSucceededRef.current = false; // Reset on open
        setStep('loading'); // Start in loading state to prevent flash
        setSoNumber('');
        setSearchError('');
        setSelectedSale(null);
        
        // Add cache-busting parameter to ensure fresh settings
        fetch(getApiUrl(`/pos-settings?_t=${Date.now()}`), { cache: 'no-store' })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
                const settings = result.data;
                setPosSettings(settings);
                if (settings.enableVoidReturnAuth) {
                    setStep('auth');
                } else {
                    setStep('input_so');
                }
            } else {
                // Fallback if settings fail
                setStep('input_so');
            }
          })
          .catch(() => setStep('input_so'));
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
      if (!open && !authSucceededRef.current) {
          // Only close the entire flow if auth was cancelled (not successful)
          onOpenChange(false);
      }
      // Reset the ref for next time
      authSucceededRef.current = false;
  };

  const handleSearchSO = async () => {
      const term = soNumber.trim();
      if (!term) return;
      
      setIsLoading(true);
      setSearchError('');
      console.log('VoidSalesDialog: Searching for SO:', term);
      
      try {
          const response = await fetch(getApiUrl(`/pos/recent-sales?query=${encodeURIComponent(term)}`));
          if (!response.ok) throw new Error(`API error ${response.status}`);
          const result = await response.json();
          console.log('VoidSalesDialog: Search result:', result);
          
          if (result.success && result.data && result.data.length > 0) {
              // Find exact match preferred, or take first
              // API searches "LIKE", so we might get partials. 
              const found = result.data.find((s: any) => String(s.orderNumber) === term || s.id === term) || result.data[0];
              console.log('VoidSalesDialog: Found sale:', found);
              setSelectedSale(found);
              setStep('select_items');
          } else {
              console.warn('VoidSalesDialog: No matching transaction found.');
              setSearchError('Transaction not found. Please check the SO Number.');
          }
      } catch (err) {
          console.error('VoidSalesDialog: Search error', err);
          setSearchError('Error searching transaction.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState('');
  const { print } = usePrinter(posSettings?.printMode || 'browser', posSettings?.nativePrinterName);

  const handlePrintVoid = async (saleData: any) => {
      try {
          if (!posSettings || posSettings.printMode === 'none') return;

          const generator = new VoidSlipGenerator();
          const buffer = generator.generateVoidSlip(saleData, posSettings);
          
          await print(buffer);
      } catch (error) {
          console.error('Error printing void slip:', error);
      }
  };
  
  const handleVoidTransaction = async () => {
      if (!selectedSale) return;
      
      setIsVoiding(true);
      setVoidError('');
      
      try {
          const response = await fetch(getApiUrl('/pos/void-transaction'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ saleId: selectedSale.id }),
          });
          const result = await response.json();
          
          if (result.success) {
              // Print the void slip before closing
              await handlePrintVoid(selectedSale);
              
              // Small delay to ensure print job is sent
              setTimeout(() => {
                  onOpenChange(false);
              }, 1000);
          } else {
              setVoidError(result.error || 'Failed to void transaction');
          }
      } catch (err) {
          console.error('VoidSalesDialog: Error voiding transaction', err);
          setVoidError('Error connecting to server');
      } finally {
          setIsVoiding(false);
      }
  };

  const handleBackToSearch = () => {
      setStep('input_so');
      setSelectedSale(null);
      setSoNumber('');
  };

  return (
    <>
      <Sheet open={isOpen && (step === 'input_so' || step === 'select_items')} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-xl w-full flex flex-col">
            {step === 'select_items' && selectedSale ? (
                 <ConfirmVoidView
                    sale={selectedSale}
                    onVoidTransaction={handleVoidTransaction}
                    onBack={handleBackToSearch}
                    isVoiding={isVoiding}
                    voidError={voidError}
                />
            ) : (
                <div className="flex h-full flex-col">
                    <SheetHeader className="shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950">
                                <Ban className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle>Void Transaction</SheetTitle>
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
                                    <TransactionPickRow key={sale.id} sale={sale} onPick={handlePickSale} accent="rose" />
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
        requiredCredentials={null}
        title="Void Authorization"
        description="Enter admin credentials to access void functions."
      />
    </>
  );
}

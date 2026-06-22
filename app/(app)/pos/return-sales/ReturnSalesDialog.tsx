'use client';

import { useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo, Search, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { AdminAuthDialog } from '../admin-auth/AdminAuthDialog';
import { TransactionPickRow } from './TransactionPickRow';
import { SelectItemsView } from './SelectItemsView';
import { ReturnSuccessView } from './ReturnSuccessView';
import { CreditSlipView } from '../credit-slip/CreditSlipView';
import { useReturnSales } from './use-return-sales';
import type { ReturnSalesDialogProps } from './return-sales-types';
import { format } from 'date-fns';

export function ReturnSalesDialog({
  isOpen,
  onOpenChange,
  currentUser,
  terminalId,
  printMode
}: ReturnSalesDialogProps) {
  const creditSlipRef = useRef<HTMLDivElement>(null);

  const {
    step,
    isLoading,
    soNumber,
    setSoNumber,
    searchError,
    selectedSale,
    returnedItems,
    returnedTotal,
    recentSales,
    isRecentLoading,
    posSettings,
    handlePickSale,
    handleAuthSuccess,
    handleAuthClose,
    handleSearchSO,
    handleReturnItems,
    handleBackToSearch,
    handleCloseSuccess,
    handlePrintCredit,
  } = useReturnSales({
    isOpen,
    onOpenChange,
    currentUser,
    terminalId,
    printMode,
    creditSlipRef,
  });

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

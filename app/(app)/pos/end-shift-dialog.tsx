'use client';

import { useState, useMemo, useEffect, memo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Banknote, Coins, CheckCircle2, AlertTriangle, Calculator, FileText, ArrowRight } from 'lucide-react';

interface EndShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onShiftEnd: (data: { actualCash: number; cashDifference: number; notes: string; cashDenominations: any[] }) => void;
  startingCash: number;
  cashSales: number;
  cashIn?: number;
  cashOut?: number;
}

const billDenominations = [
  { value: 1000, label: '₱1,000' },
  { value: 500, label: '₱500' },
  { value: 200, label: '₱200' },
  { value: 100, label: '₱100' },
  { value: 50, label: '₱50' },
  { value: 20, label: '₱20' },
];

const coinDenominations = [
  { value: 10, label: '₱10 Coin' },
  { value: 5, label: '₱5 Coin' },
  { value: 1, label: '₱1 Coin' },
  { value: 0.25, label: '₱0.25 Coin' },
  { value: 0.05, label: '₱0.05 Coin' },
  { value: 0.01, label: '₱0.01 Coin' },
];

const DenominationInput = memo(({ 
  denom, 
  color, 
  count, 
  onCountChange 
}: { 
  denom: { value: number, label: string }, 
  color: string,
  count: number | undefined,
  onCountChange: (value: number, count: string) => void
}) => {
  const subtotal = (count || 0) * denom.value;
  
  // Format the visual badge (e.g., 1000, 10, .25, .05)
  const displayBadge = denom.value >= 1 
    ? denom.value.toString() 
    : denom.value.toFixed(2).substring(1); // .25, .05, etc.

  const hasCount = (count || 0) > 0;

  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm transition-all hover:shadow ${hasCount ? 'border-slate-300 ring-1 ring-slate-100' : 'border-slate-200'}`}>
      <div className={`flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg border font-bold text-sm tabular-nums ${color}`}>
        {displayBadge}
      </div>
      <Label htmlFor={`denom-${denom.value}`} className="flex-1 min-w-0 truncate text-sm font-medium text-slate-500">
        {denom.label}
      </Label>
      <span className="text-slate-300 font-mono text-sm">×</span>
      <Input
        id={`denom-${denom.value}`}
        type="number"
        placeholder="0"
        value={count || ''}
        onChange={(e) => onCountChange(denom.value, e.target.value)}
        className="w-16 h-9 text-center font-mono font-semibold"
        autoFocus={denom.value === 1000}
      />
      <div className={`w-24 text-right font-mono text-sm font-bold tabular-nums ${hasCount ? 'text-slate-800' : 'text-slate-300'}`}>
        ₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(subtotal)}
      </div>
    </div>
  );
});

DenominationInput.displayName = 'DenominationInput';

export function EndShiftDialog({ isOpen, onOpenChange, onShiftEnd, startingCash, cashSales, cashIn = 0, cashOut = 0 }: EndShiftDialogProps) {
  const [counts, setCounts] = useState<Record<number, number>>({});
  
  const countedCash = useMemo(() => {
    return [...billDenominations, ...coinDenominations].reduce((acc, denom) => {
      return acc + (counts[denom.value] || 0) * denom.value;
    }, 0);
  }, [counts]);

  const expectedCash = useMemo(() => startingCash + cashSales + (cashIn || 0) - (cashOut || 0), [startingCash, cashSales, cashIn, cashOut]);
  const variance = useMemo(() => countedCash - expectedCash, [countedCash, expectedCash]);
  
  const handleCountChange = (value: number, count: string) => {
    const numCount = parseInt(count, 10);
    setCounts(prev => ({
      ...prev,
      [value]: isNaN(numCount) || numCount < 0 ? 0 : numCount,
    }));
  };

  const handleEndShift = () => {
    // In a real app, you would save the end-of-shift report here.
    onShiftEnd({
        actualCash: countedCash,
        cashDifference: variance,
        notes: `End shift variance: ${variance}`,
        cashDenominations: Object.entries(counts).map(([value, qty]) => ({
             amount: parseFloat(value),
             qty,
             total: parseFloat(value) * qty
        })).filter(d => d.qty > 0)
    });
  };
  
  useEffect(() => {
    if (isOpen) {
      setCounts({});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleEndShift();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleEndShift]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-screen w-full flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b text-left space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calculator className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <SheetTitle className="text-lg font-bold">End Current Shift</SheetTitle>
              <SheetDescription>
                Count the cash in your drawer and confirm the totals to end your shift.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-hidden px-6 py-5 grid lg:grid-cols-5 gap-6">
            {/* Cash Drawer Count */}
            <div className="lg:col-span-3 flex flex-col min-h-0 space-y-3">
              <div className="flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-slate-700">Cash Drawer Count</h3>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold font-mono text-white tabular-nums shadow-sm">
                  ₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(countedCash)}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border bg-slate-50/60 p-4 space-y-5">
                  <section className="space-y-2">
                    <div className="flex items-center gap-2 mb-1 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                      <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                      Bills
                    </div>
                    <div className="space-y-2">
                      {billDenominations.map(denom => (
                        <DenominationInput
                          key={denom.value}
                          denom={denom}
                          color="bg-emerald-50 text-emerald-700 border-emerald-100"
                          count={counts[denom.value]}
                          onCountChange={handleCountChange}
                        />
                      ))}
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-2">
                    <div className="flex items-center gap-2 mb-1 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      Coins
                    </div>
                    <div className="space-y-2">
                      {coinDenominations.map(denom => (
                        <DenominationInput
                          key={denom.value}
                          denom={denom}
                          color="bg-amber-50 text-amber-700 border-amber-100"
                          count={counts[denom.value]}
                          onCountChange={handleCountChange}
                        />
                      ))}
                    </div>
                  </section>
              </div>
            </div>

            {/* Shift Settlement */}
            <div className="lg:col-span-2 flex flex-col min-h-0 overflow-y-auto space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-slate-700 text-lg">Shift Settlement</h3>
                </div>

                <div className="space-y-0 relative overflow-hidden rounded-2xl border shadow-sm bg-white pt-2">
                    <div className="px-6 py-4 space-y-4">
                        <div className="flex justify-between items-center group">
                            <span className="text-slate-500 text-sm">Beginning Balance</span>
                            <span className="font-mono font-medium">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(startingCash)}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-slate-500 text-sm">Cash Sales</span>
                            <span className="font-mono font-medium text-emerald-600">+₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(cashSales)}</span>
                        </div>
                        {(cashIn > 0 || cashOut > 0) && (
                            <>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-500 text-sm">Cash Deposits (In)</span>
                                    <span className="font-mono font-medium text-emerald-600">+₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(cashIn)}</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-500 text-sm">Cash Pickups (Out)</span>
                                    <span className="font-mono font-medium text-red-600">-₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(cashOut)}</span>
                                </div>
                            </>
                        )}
                        
                        <Separator className="bg-slate-100" />
                        
                        <div className="flex justify-between items-center py-2">
                            <span className="text-slate-800 font-bold uppercase text-xs tracking-widest">Expected Transfer</span>
                            <span className="text-lg font-black font-mono">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(expectedCash)}</span>
                        </div>
                        
                        <div className="rounded-xl bg-slate-900 text-slate-50 p-5 mt-2 shadow-lg">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Actual Counted</span>
                                <CheckCircle2 className={`w-4 h-4 ${variance === 0 ? 'text-emerald-400' : 'text-slate-600'}`} />
                            </div>
                            <div className="text-3xl font-black font-mono tracking-tighter">
                                ₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(countedCash)}
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 mt-2 border-t ${
                        Math.round(variance * 100) === 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                        variance > 0 ? 'bg-blue-50 text-blue-800 border-blue-100' :
                        'bg-red-50 text-red-800 border-red-100'
                    }`}>
                        <div className="flex items-center justify-center gap-3">
                            {Math.round(variance * 100) === 0 ? (
                              <>
                                <CheckCircle2 className="w-6 h-6" />
                                <span className="font-black uppercase tracking-widest">Perfect Balance</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-6 h-6" />
                                <div className="text-center">
                                  <div className="font-black uppercase tracking-tight leading-none">
                                      {variance > 0 ? 'Cash Overage' : 'Cash Shortage'}
                                  </div>
                                  <div className="font-mono text-xl font-black">
                                      ₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(Math.abs(variance))}
                                  </div>
                                </div>
                              </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <div className="flex gap-3 text-xs text-slate-500 italic">
                    <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <p>Total counted cash will be transferred to the main vault upon submission. Please re-verify any shortage exceeding ₱50.00.</p>
                  </div>
                </div>
            </div>
        </div>
        <SheetFooter className="px-6 py-4 border-t bg-background gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            onClick={handleEndShift}
            variant="destructive"
          >
            Confirm and End Shift
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

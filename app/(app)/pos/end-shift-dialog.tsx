
'use client';

import { useState, useMemo, useEffect, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Banknote, Coins, CheckCircle2, AlertTriangle, Calculator, FileText, ArrowRight } from 'lucide-react';

interface EndShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onShiftEnd: () => void;
  startingCash: number;
  cashSales: number;
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

  return (
    <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
      <div className={`w-12 h-10 rounded flex items-center justify-center font-bold text-xs ${color} border`}>
        {displayBadge}
      </div>
      <div className="flex-1 min-w-0">
        <Label htmlFor={`denom-${denom.value}`} className="text-sm font-semibold truncate block">
          {denom.label}
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs uppercase font-bold">Qty</span>
        <Input
          id={`denom-${denom.value}`}
          type="number"
          placeholder="0"
          value={count || ''}
          onChange={(e) => onCountChange(denom.value, e.target.value)}
          className="w-20 h-9 text-right font-mono"
          autoFocus={denom.value === 1000}
        />
      </div>
      <div className="w-28 text-right font-mono text-sm font-bold text-slate-700">
        ₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(subtotal)}
      </div>
    </div>
  );
});

DenominationInput.displayName = 'DenominationInput';

export function EndShiftDialog({ isOpen, onOpenChange, onShiftEnd, startingCash, cashSales }: EndShiftDialogProps) {
  const [counts, setCounts] = useState<Record<number, number>>({});
  
  const countedCash = useMemo(() => {
    return [...billDenominations, ...coinDenominations].reduce((acc, denom) => {
      return acc + (counts[denom.value] || 0) * denom.value;
    }, 0);
  }, [counts]);

  const expectedCash = useMemo(() => startingCash + cashSales, [startingCash, cashSales]);
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
    console.log({
        startingCash,
        cashSales,
        expectedCash,
        countedCash,
        variance,
    });
    onShiftEnd();
  };
  
  useEffect(() => {
    if (isOpen) {
      setCounts({});
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>End Current Shift</DialogTitle>
          <DialogDescription>
            Count the cash in your drawer and confirm the totals to end your shift.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 mt-2">
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Calculator className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-slate-700">Denominations</h3>
              </div>
              <ScrollArea className="h-[450px] pr-4 border rounded-xl bg-white shadow-sm">
                <div className="p-4 space-y-6">
                  <section className="space-y-2">
                    <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-400 uppercase tracking-tighter px-1">
                      <Banknote className="w-4 h-4 text-emerald-500" />
                      Bills
                    </div>
                    <div className="space-y-1">
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
                    <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-400 uppercase tracking-tighter px-1">
                      <Coins className="w-4 h-4 text-amber-500" />
                      Coins
                    </div>
                    <div className="space-y-1">
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
              </ScrollArea>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-2 px-1">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-slate-700 text-lg">Shift Settlement Report</h3>
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            onClick={handleEndShift}
            variant="destructive"
          >
            Confirm and End Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

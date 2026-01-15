
'use client';

import { useState, useMemo, useEffect } from 'react';
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

  const DenominationInput = ({ denom }: { denom: { value: number, label: string }}) => (
    <div key={denom.value} className="grid grid-cols-3 items-center gap-4">
      <Label htmlFor={`denom-${denom.value}`} className="text-right">
        {denom.label}
      </Label>
      <span className="text-center text-muted-foreground">x</span>
      <Input
        id={`denom-${denom.value}`}
        type="number"
        placeholder="0"
        value={counts[denom.value] || ''}
        onChange={(e) => handleCountChange(denom.value, e.target.value)}
        className="col-span-1"
        autoFocus={denom.value === 1000}
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>End Current Shift</DialogTitle>
          <DialogDescription>
            Count the cash in your drawer and confirm the totals to end your shift.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8">
            <ScrollArea className="h-96 pr-6">
            <div className="py-4 grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-4">
                <h3 className="font-medium text-center">Bills</h3>
                {billDenominations.map(denom => (
                    <DenominationInput key={denom.value} denom={denom} />
                ))}
                </div>
                <div className="space-y-4">
                <h3 className="font-medium text-center">Coins</h3>
                {coinDenominations.map(denom => (
                    <DenominationInput key={denom.value} denom={denom} />
                ))}
                </div>
            </div>
            </ScrollArea>
            <div className="space-y-4 pt-4">
                <h3 className="font-medium text-lg">Shift Summary</h3>
                <div className="space-y-2 rounded-lg border p-4">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Starting Cash:</span>
                        <span>₱{startingCash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Cash Sales:</span>
                        <span>₱{cashSales.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                        <span className="text-muted-foreground">Expected in Drawer:</span>
                        <span>₱{expectedCash.toFixed(2)}</span>
                    </div>
                </div>

                <div className="space-y-2 rounded-lg border p-4">
                    <div className="flex justify-between font-semibold">
                        <span className="text-muted-foreground">Counted Cash:</span>
                        <span className="text-xl">₱{countedCash.toFixed(2)}</span>
                    </div>
                </div>

                 <Alert variant={variance === 0 ? 'default' : 'destructive'} className="text-center">
                    <AlertDescription className="font-bold text-xl">
                        {variance > 0 && `OVERAGE: ₱${variance.toFixed(2)}`}
                        {variance < 0 && `SHORTAGE: ₱${Math.abs(variance).toFixed(2)}`}
                        {variance === 0 && `NO VARIANCE`}
                    </AlertDescription>
                </Alert>
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


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

interface StartShiftDialogProps {
  isOpen: boolean;
  onShiftStart: (totalCash: number) => void;
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

// Helper component extracted to prevent re-renders losing focus
const DenominationInput = ({ 
  denom, 
  value, 
  onChange 
}: { 
  denom: { value: number, label: string }, 
  value: number | undefined, 
  onChange: (value: number, count: string) => void 
}) => (
  <div className="grid grid-cols-3 items-center gap-4">
    <Label htmlFor={`denom-${denom.value}`} className="text-right">
      {denom.label}
    </Label>
    <span className="text-center text-muted-foreground">x</span>
    <Input
      id={`denom-${denom.value}`}
      type="number"
      placeholder="0"
      value={value || ''}
      onChange={(e) => onChange(denom.value, e.target.value)}
      className="col-span-1"
    />
  </div>
);

export function StartShiftDialog({ isOpen, onShiftStart }: StartShiftDialogProps) {
  const [counts, setCounts] = useState<Record<number, number>>({});
  
  const totalCash = useMemo(() => {
    return [...billDenominations, ...coinDenominations].reduce((acc, denom) => {
      return acc + (counts[denom.value] || 0) * denom.value;
    }, 0);
  }, [counts]);
  
  const handleCountChange = (value: number, count: string) => {
    const numCount = parseInt(count, 10);
    setCounts(prev => ({
      ...prev,
      [value]: isNaN(numCount) || numCount < 0 ? 0 : numCount,
    }));
  };

  const handleStartShift = () => {
    onShiftStart(totalCash);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleStartShift();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleStartShift]);
  
  useEffect(() => {
    // Reset counts when dialog opens
    if (isOpen) {
      setCounts({});
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start New Shift</DialogTitle>
          <DialogDescription>
            Enter your starting cash denominations to begin your shift.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-80 pr-6">
          <div className="py-4 grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-4">
              <h3 className="font-medium text-center">Bills</h3>
              {billDenominations.map(denom => (
                <DenominationInput 
                  key={denom.value} 
                  denom={denom} 
                  value={counts[denom.value]}
                  onChange={handleCountChange}
                />
              ))}
            </div>
            <div className="space-y-4">
               <h3 className="font-medium text-center">Coins</h3>
              {coinDenominations.map(denom => (
                <DenominationInput 
                  key={denom.value} 
                  denom={denom} 
                  value={counts[denom.value]}
                  onChange={handleCountChange}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex justify-between items-center pt-4">
            <span className="text-lg font-medium">Total Starting Cash:</span>
            <span className="text-2xl font-bold text-primary">₱{totalCash.toFixed(2)}</span>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleStartShift}
            className="w-full"
          >
            Start Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

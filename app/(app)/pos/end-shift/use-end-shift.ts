'use client';

import { useState, useMemo, useEffect } from 'react';
import { billDenominations, coinDenominations } from './end-shift-types';

type Options = {
  isOpen: boolean;
  onShiftEnd: (data: { actualCash: number; cashDifference: number; notes: string; cashDenominations: any[] }) => void;
  startingCash: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
};

export function useEndShift({ isOpen, onShiftEnd, startingCash, cashSales, cashIn, cashOut }: Options) {
  const [counts, setCounts] = useState<Record<number, number>>({});

  const countedCash = useMemo(
    () => [...billDenominations, ...coinDenominations].reduce((acc, d) => acc + (counts[d.value] || 0) * d.value, 0),
    [counts]
  );

  const expectedCash = useMemo(
    () => startingCash + cashSales + cashIn - cashOut,
    [startingCash, cashSales, cashIn, cashOut]
  );

  const variance = useMemo(() => countedCash - expectedCash, [countedCash, expectedCash]);

  const handleCountChange = (value: number, count: string) => {
    const numCount = parseInt(count, 10);
    setCounts(prev => ({
      ...prev,
      [value]: isNaN(numCount) || numCount < 0 ? 0 : numCount,
    }));
  };

  const handleEndShift = () => {
    onShiftEnd({
      actualCash: countedCash,
      cashDifference: variance,
      notes: `End shift variance: ${variance}`,
      cashDenominations: Object.entries(counts)
        .map(([value, qty]) => ({ amount: parseFloat(value), qty, total: parseFloat(value) * qty }))
        .filter(d => d.qty > 0),
    });
  };

  useEffect(() => {
    if (isOpen) setCounts({});
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleEndShift(); }
    };
    if (isOpen) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleEndShift]);

  return { counts, countedCash, expectedCash, variance, handleCountChange, handleEndShift };
}

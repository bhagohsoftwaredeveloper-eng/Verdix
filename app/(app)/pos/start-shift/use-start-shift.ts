'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { billDenominations, coinDenominations } from './start-shift-utils';

type Options = {
  isOpen: boolean;
  onShiftStart: (totalCash: number) => void;
};

export function useStartShift({ isOpen, onShiftStart }: Options) {
  const [counts, setCounts] = useState<Record<number, number>>({});

  const totalCash = useMemo(() => {
    return [...billDenominations, ...coinDenominations].reduce((acc, denom) => {
      return acc + (counts[denom.value] || 0) * denom.value;
    }, 0);
  }, [counts]);

  const handleCountChange = useCallback((value: number, count: string) => {
    const numCount = parseInt(count, 10);
    setCounts(prev => ({
      ...prev,
      [value]: isNaN(numCount) || numCount < 0 ? 0 : numCount,
    }));
  }, []);

  const handleStartShift = useCallback(() => {
    onShiftStart(totalCash);
  }, [totalCash, onShiftStart]);

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
    if (isOpen) {
      setCounts({});
    }
  }, [isOpen]);

  return {
    counts,
    totalCash,
    handleCountChange,
    handleStartShift,
  };
}

'use client';

import { useState, useEffect } from 'react';
import type { SaleItem, SuspendedTransaction } from '../pos-content/pos-types';

type Options = {
  isOpen: boolean;
  heldTransactions: SuspendedTransaction[];
  onRestore: (index: number) => void;
};

export function useHeldTransactions({ isOpen, heldTransactions, onRestore }: Options) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) setSelectedIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (heldTransactions.length === 0) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < heldTransactions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onRestore(selectedIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, heldTransactions, selectedIndex, onRestore]);

  const calculateTotal = (items: SaleItem[]) =>
    items.reduce((acc, item) => acc + item.price * item.quantity * (1 - item.discount / 100), 0);

  const calculateItemCount = (items: SaleItem[]) =>
    items.reduce((acc, item) => acc + item.quantity, 0);

  return { selectedIndex, setSelectedIndex, calculateTotal, calculateItemCount };
}

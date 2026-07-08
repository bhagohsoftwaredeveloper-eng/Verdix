'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addSupplierPayment, SupplierWithBalance } from '../actions';
import { dispatchStockUpdate } from '@/hooks/use-live-refresh';

export type BulkPaymentRow = {
  supplierId: string;
  supplierName: string;
  balance: number;
  amount: number;
  status: 'pending' | 'success' | 'error';
};

type Props = {
  suppliers: SupplierWithBalance[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
};

export function useBulkPayment({ suppliers, open, onOpenChange, onComplete }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<BulkPaymentRow[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(
        suppliers
          .filter(s => s.balance > 0)
          .map(s => ({
            supplierId: s.id,
            supplierName: s.name,
            balance: s.balance,
            amount: parseFloat(s.balance.toFixed(2)),
            status: 'pending',
          })),
      );
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('');
      setReference('');
      setProgress(0);
      setIsDone(false);
    }
  }, [open, suppliers]);

  const total = rows.reduce((sum, r) => sum + (r.amount > 0 ? r.amount : 0), 0);
  const activeRows = rows.filter(r => r.amount > 0);

  const handleAmountChange = (supplierId: string, amount: number) => {
    setRows(prev =>
      prev.map(r => r.supplierId === supplierId ? { ...r, amount: Math.min(amount, r.balance) } : r),
    );
  };

  const handleFillAll = () => {
    setRows(prev => prev.map(r => ({ ...r, amount: parseFloat(r.balance.toFixed(2)) })));
  };

  const handleClearAll = () => {
    setRows(prev => prev.map(r => ({ ...r, amount: 0 })));
  };

  const handleSubmit = async () => {
    if (!paymentMethod) {
      toast({ variant: 'destructive', title: 'Payment method required', description: 'Please select a payment method before submitting.' });
      return;
    }
    if (activeRows.length === 0) {
      toast({ variant: 'destructive', title: 'No amounts entered', description: 'Enter a payment amount for at least one supplier.' });
      return;
    }

    setIsSubmitting(true);
    setProgress(0);
    const updated = rows.map(r => ({ ...r, status: 'pending' as const }));
    setRows(updated);

    let done = 0;
    const toProcess = updated.filter(r => r.amount > 0);

    for (let i = 0; i < toProcess.length; i++) {
      const row = toProcess[i];
      try {
        await addSupplierPayment({
          supplierId: row.supplierId,
          amount: row.amount,
          date,
          paymentMethod,
          reference: reference || undefined,
          notes: 'Bulk payment',
          allocations: [],
        });
        setRows(prev => prev.map(r => r.supplierId === row.supplierId ? { ...r, status: 'success' } : r));
      } catch {
        setRows(prev => prev.map(r => r.supplierId === row.supplierId ? { ...r, status: 'error' } : r));
      }
      done++;
      setProgress(Math.round((done / toProcess.length) * 100));
    }

    setIsSubmitting(false);
    setIsDone(true);
    dispatchStockUpdate();

    setRows(prev => {
      const hasError = prev.some(r => r.amount > 0 && r.status === 'error');
      if (!hasError) {
        toast({ title: 'Bulk Payment Complete', description: `${toProcess.length} payment(s) recorded successfully.` });
        onComplete();
        onOpenChange(false);
      } else {
        const errCount = prev.filter(r => r.status === 'error').length;
        toast({
          variant: 'destructive',
          title: 'Some payments failed',
          description: `${toProcess.length - errCount} succeeded, ${errCount} failed. Review errors below.`,
        });
      }
      return prev;
    });
  };

  return {
    rows, date, setDate,
    paymentMethod, setPaymentMethod,
    reference, setReference,
    isSubmitting, progress, isDone,
    total, activeRows,
    handleAmountChange, handleFillAll, handleClearAll, handleSubmit,
  };
}

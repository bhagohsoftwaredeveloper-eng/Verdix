'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { addSupplierPayment, SupplierWithBalance, getUnpaidPurchaseOrders, getSupplierAdvanceCredit } from '../actions';
import { printSupplierVoucher } from '@/lib/print-supplier-voucher';
import { dispatchStockUpdate } from '@/hooks/use-live-refresh';
import { paymentSchema, PaymentFormValues } from './payment-dialog-types';

type Props = {
  supplier: SupplierWithBalance;
  onPaymentComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function useMakePayment({ supplier, onPaymentComplete, open: controlledOpen, onOpenChange: setControlledOpen }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (setControlledOpen ?? (() => {})) : setInternalOpen;

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unpaidPOs, setUnpaidPOs] = useState<any[]>([]);
  const [selectedPOs, setSelectedPOs] = useState<Record<string, number>>({});
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [advanceCredit, setAdvanceCredit] = useState(0);
  const [showPrintResult, setShowPrintResult] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);
  const [poSearchTerm, setPoSearchTerm] = useState('');

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      reference: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchPOs();
      getSupplierAdvanceCredit(supplier.id).then(setAdvanceCredit).catch(() => setAdvanceCredit(0));
    }
  }, [open, supplier.id]);

  const fetchPOs = async () => {
    setLoadingPOs(true);
    try {
      const pos = await getUnpaidPurchaseOrders(supplier.id);
      setUnpaidPOs(pos);
    } catch (error) {
      console.error('Failed to fetch POs:', error);
    } finally {
      setLoadingPOs(false);
    }
  };

  const handleAutoAllocate = () => {
    const totalAmount = form.getValues('amount');
    let remaining = totalAmount;
    const newSelected: Record<string, number> = {};
    for (const po of unpaidPOs) {
      if (remaining <= 0) break;
      const allocAmount = Math.min(remaining, po.balance);
      newSelected[po.id] = allocAmount;
      remaining -= allocAmount;
    }
    setSelectedPOs(newSelected);
  };

  const handlePOToggle = (poId: string, balance: number) => {
    setSelectedPOs(prev => {
      const next = { ...prev };
      if (next[poId]) delete next[poId];
      else next[poId] = balance;
      return next;
    });
  };

  const handlePOAmountChange = (poId: string, amount: number, balance: number) => {
    setSelectedPOs(prev => ({ ...prev, [poId]: Math.min(amount, balance) }));
  };

  const filteredPOs = unpaidPOs.filter(po =>
    (po.referenceNumber?.toLowerCase() || '').includes(poSearchTerm.toLowerCase()) ||
    (po.id?.toLowerCase() || '').includes(poSearchTerm.toLowerCase())
  );

  const totalAllocated = Object.values(selectedPOs).reduce((sum, val) => sum + val, 0);

  const onSubmit = async (values: PaymentFormValues) => {
    if (totalAllocated > values.amount) {
      toast({ variant: 'destructive', title: 'Allocation Error', description: 'Allocated amount exceeds total payment amount.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addSupplierPayment({
        supplierId: supplier.id,
        amount: values.amount,
        date: values.date,
        paymentMethod: values.paymentMethod,
        reference: values.reference,
        notes: values.notes,
        allocations: Object.entries(selectedPOs).map(([id, amount]) => ({ purchaseOrderId: id, amount })),
      });

      if (result.success) {
        setLastPayment({
          id: `sp_${Date.now()}`,
          supplierName: supplier.name,
          date: values.date,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          reference: values.reference,
          notes: values.notes,
          allocations: Object.entries(selectedPOs).map(([id, amount]) => ({
            purchaseOrderId: id,
            amount,
            referenceNumber: unpaidPOs.find(p => p.id === id)?.referenceNumber,
          })),
        });
        toast({ title: 'Payment Recorded', description: `Payment of ₱${values.amount.toFixed(2)} recorded for ${supplier.name}.` });
        setOpen(false);
        form.reset();
        setSelectedPOs({});
        setShowPrintResult(true);
        dispatchStockUpdate();
        onPaymentComplete?.();
      } else {
        throw new Error(result.message);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to record payment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintVoucher = () => {
    if (lastPayment) printSupplierVoucher(lastPayment);
  };

  return {
    open, setOpen,
    form, isSubmitting, onSubmit,
    loadingPOs, filteredPOs, selectedPOs,
    poSearchTerm, setPoSearchTerm,
    handleAutoAllocate, handlePOToggle, handlePOAmountChange,
    totalAllocated, advanceCredit,
    showPrintResult, setShowPrintResult, handlePrintVoucher,
  };
}

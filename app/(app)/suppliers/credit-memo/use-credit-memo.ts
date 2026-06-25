'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
  addSupplierCreditMemo,
  getSupplierAllPOs,
  SupplierCreditMemoReason,
} from '../actions';

export const CREDIT_MEMO_REASONS: SupplierCreditMemoReason[] = [
  'Goods Return',
  'Price Adjustment',
  'Short Delivery',
  'Quality Issue',
  'Other',
];

const creditMemoSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  reason: z.enum([
    'Goods Return',
    'Price Adjustment',
    'Short Delivery',
    'Quality Issue',
    'Other',
  ] as const),
  purchaseOrderId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type CreditMemoFormValues = z.infer<typeof creditMemoSchema>;

type Props = {
  supplierId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete?: () => void;
};

export function useCreditMemo({ supplierId, open: controlledOpen, onOpenChange, onComplete }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierPOs, setSupplierPOs] = useState<any[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);

  const form = useForm<CreditMemoFormValues>({
    resolver: zodResolver(creditMemoSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      reason: 'Goods Return',
      purchaseOrderId: '',
      reference: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open && supplierId) {
      setLoadingPOs(true);
      getSupplierAllPOs(supplierId)
        .then(pos => setSupplierPOs(pos))
        .catch(err => console.error('Failed to load POs:', err))
        .finally(() => setLoadingPOs(false));
    }
  }, [open, supplierId]);

  const onSubmit = async (values: CreditMemoFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await addSupplierCreditMemo({
        supplierId,
        amount: values.amount,
        date: values.date,
        reason: values.reason,
        purchaseOrderId: values.purchaseOrderId || undefined,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
      });

      if (result.success) {
        toast({
          title: 'Credit Memo Recorded',
          description: `₱${values.amount.toFixed(2)} credit memo has been recorded successfully.`,
        });
        setOpen(false);
        form.reset();
        onComplete?.();
      } else {
        throw new Error('result.message' in result ? result.message : 'Failed');
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to record credit memo. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    open, setOpen,
    form, isSubmitting, onSubmit,
    supplierPOs, loadingPOs,
  };
}

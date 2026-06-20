'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { transferSchema, type TransferFormValues } from './cash-transfer-types';

type Options = {
  isOpen: boolean;
  shiftId: string | null;
  terminalId: string;
  userId: string;
  onOpenChange: (open: boolean) => void;
};

export function useCashTransfer({ isOpen, shiftId, terminalId, userId, onOpenChange }: Options) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [transferType, setTransferType] = useState<'pickup' | 'deposit'>('pickup');
  const { toast } = useToast();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { amount: 0, reason: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
      setTransferType('pickup');
    }
  }, [isOpen, form]);

  const handleAdminAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    form.handleSubmit(onSubmit)();
  };

  async function onSubmit(values: TransferFormValues) {
    try {
      const response = await fetch(getApiUrl('/pos/cash-transfer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, terminalId, userId, amount: values.amount, type: transferType, reason: values.reason }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: 'Transfer Recorded', description: `Successfully recorded cash ${transferType}.` });
        onOpenChange(false);
      } else {
        toast({ title: 'Transfer Failed', description: result.error || 'Failed to record transfer.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Transfer Failed', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
  }

  const { isSubmitting } = form.formState;

  return {
    form, isSubmitting,
    transferType, setTransferType,
    isAuthDialogOpen, setIsAuthDialogOpen,
    handleAdminAuthSuccess, onSubmit,
  };
}

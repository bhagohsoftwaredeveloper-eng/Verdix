'use client';

import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Account } from '@/lib/types';

export type AccountType = 'income' | 'expense';
export type AccountSaveHandler = (name: string, type: AccountType, code?: string) => Promise<void>;

export interface UseAccountFormProps {
  account?: Account;
  onSave: AccountSaveHandler;
}

/**
 * Controller for the add/edit account dialog form: holds the field state and
 * encapsulates validation + save behaviour so the dialog stays presentational.
 */
export function useAccountForm({ account, onSave }: UseAccountFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<AccountType>(account?.type || 'income');
  const [code, setCode] = useState(account?.code || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setName('');
    setCode('');
    setType('income');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Account name cannot be empty.',
      });
      return;
    }
    if (!type) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Account type is required.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name, type, code || undefined);
      toast({
        title: account ? 'Account Updated' : 'Account Added',
        description: `Account "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!account) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save account', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save account. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    name,
    setName,
    type,
    setType,
    code,
    setCode,
    isSaving,
    handleSave,
  };
}

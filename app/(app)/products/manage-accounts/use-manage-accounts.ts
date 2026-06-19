'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Account } from '@/lib/types';

import { addAccount, deleteAccount, getAccounts, updateAccount } from '../actions';
import type { AccountType } from './use-account-form';

export interface UseManageAccountsProps {
  onAccountAdded?: (account: Account) => void;
  onAccountUpdated?: () => void;
}

/**
 * Controller for the Manage Accounts list: loads accounts and exposes the
 * add/update/delete handlers (data + toasts) so the dialog only renders UI.
 */
export function useManageAccounts({ onAccountAdded, onAccountUpdated }: UseManageAccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshAccounts = async () => {
    try {
      const loadedAccounts = await getAccounts();
      setAccounts(loadedAccounts);
    } catch (error) {
      console.error('Error loading accounts', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAccounts();
  }, []);

  const handleAddAccount = async (name: string, type: AccountType, code?: string) => {
    const result = await addAccount(name, type, code);
    if (result.success) {
      await refreshAccounts();
      if (result.account) {
        onAccountAdded?.(result.account as Account);
      } else {
        // Fallback if account object isn't returned (shouldn't happen with updated action)
        onAccountAdded?.({ id: result.accountId!, name, type, code } as Account);
      }
    }
  };

  const handleUpdateAccount = async (id: string, name: string, type: AccountType, code?: string) => {
    const result = await updateAccount(id, name, type, code);
    if (result.success) {
      toast({
        title: 'Account Updated',
        description: result.message,
      });
      await refreshAccounts();
      onAccountUpdated?.();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const result = await deleteAccount(id);
    if (result.success) {
      toast({
        title: 'Account Deleted',
        description: result.message,
      });
      await refreshAccounts();
      onAccountUpdated?.();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  return {
    accounts,
    isLoading,
    handleAddAccount,
    handleUpdateAccount,
    handleDeleteAccount,
  };
}

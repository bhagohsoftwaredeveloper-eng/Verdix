'use client';

import { useState } from 'react';
import { FileText, PlusCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Account } from '@/lib/types';

import { AccountDialog } from './account-dialog';
import { AccountRow } from './account-row';
import { AccountSkeleton } from './account-skeleton';
import { useManageAccounts } from './use-manage-accounts';

export function ManageAccountsDialog({
  trigger,
  onAccountAdded,
  onAccountUpdated,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  onAccountAdded?: (account: Account) => void;
  onAccountUpdated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { accounts, isLoading, handleAddAccount, handleUpdateAccount, handleDeleteAccount } =
    useManageAccounts({ onAccountAdded, onAccountUpdated });

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const dialogTrigger = trigger || (
    <Button variant="outline">
      <FileText className="mr-2 h-4 w-4" />
      Manage Accounts
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Accounts</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your income and expense accounts for proper accounting.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex justify-end mb-4">
            <AccountDialog onSave={handleAddAccount}>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </AccountDialog>
          </div>
          <Card>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 4 }).map((_, i) => <AccountSkeleton key={i} />)}
                  {!isLoading && accounts.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      onUpdate={handleUpdateAccount}
                      onDelete={handleDeleteAccount}
                    />
                  ))}
                  {!isLoading && accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
                        No accounts found. Add an account to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <DialogTrigger asChild>
            <Button variant="outline">Close</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

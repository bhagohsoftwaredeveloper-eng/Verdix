'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Account } from '@/lib/types';

import { AccountDialog } from './account-dialog';
import type { AccountType } from './use-account-form';

export function AccountRow({
  account,
  onUpdate,
  onDelete,
}: {
  account: Account;
  onUpdate: (id: string, name: string, type: AccountType, code?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{account.name}</TableCell>
      <TableCell>{account.type === 'income' ? 'Income' : 'Expense'}</TableCell>
      <TableCell>{account.code || '-'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <AccountDialog
            account={account}
            onSave={(name, type, code) => onUpdate(account.id, name, type, code)}
          >
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </AccountDialog>
          <Button variant="destructive" size="sm" onClick={() => onDelete(account.id)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

'use client';

import { SalesPerson } from '@/lib/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { SalesPersonFormDialog } from './SalesPersonFormDialog';

type Props = {
  salesPerson: SalesPerson;
  onUpdate: (name: string, contactNumber?: string) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function SalesPersonRow({ salesPerson, onUpdate, onDelete }: Props) {
  return (
    <TableRow>
      <TableCell className="font-medium">{salesPerson.name}</TableCell>
      <TableCell>{salesPerson.contactNumber || 'N/A'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <SalesPersonFormDialog salesPerson={salesPerson} onSave={onUpdate}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </SalesPersonFormDialog>
          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Supplier } from '@/lib/types';

import { SupplierFormDialog } from './supplier-form-dialog';

export function SupplierRow({
  supplier,
  onUpdateSupplier,
  onDeleteSupplier,
}: {
  supplier: Supplier;
  onUpdateSupplier: (data: any) => void;
  onDeleteSupplier: () => void;
}) {
  const { toast } = useToast();

  const handleUpdate = async (data: any) => {
    onUpdateSupplier(data);
    toast({
      title: 'Supplier Updated',
      description: `Supplier "${data.name}" has been successfully updated.`,
    });
  };

  const handleDelete = () => {
    onDeleteSupplier();
    toast({
      title: 'Supplier Deleted',
      description: `Supplier "${supplier.name}" has been deleted.`,
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{supplier.name}</TableCell>
      <TableCell>{supplier.company || '-'}</TableCell>
      <TableCell>{supplier.tin || '-'}</TableCell>
      <TableCell>{supplier.address || '-'}</TableCell>
      <TableCell>{supplier.contactNumber || supplier.mobilePhone}</TableCell>
      <TableCell>{supplier.paymentTerms || '-'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <SupplierFormDialog supplier={supplier} onSave={handleUpdate}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </SupplierFormDialog>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Supplier } from '@/lib/types';

export function SupplierRow({
  supplier,
  onEdit,
  onDeleteSupplier,
}: {
  supplier: Supplier;
  onEdit: (supplier: Supplier) => void;
  onDeleteSupplier: () => void;
}) {
  const { toast } = useToast();

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
          <Button variant="outline" size="sm" onClick={() => onEdit(supplier)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

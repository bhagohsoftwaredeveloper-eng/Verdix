'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';
import { CustomerDialog } from './CustomerDialog';

interface CustomerRowProps {
  customer: Customer;
  onCustomersUpdated: () => void;
}

export function CustomerRow({ customer, onCustomersUpdated }: CustomerRowProps) {
  const { toast } = useToast();

  const handleUpdate = async (name: string, contactNumber: string, paymentTerms: string) => {
    console.log('Mock update:', { id: customer.id, name, contactNumber, paymentTerms });
    onCustomersUpdated();
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete the customer "${customer.name}"?`)) {
      console.log('Mock delete:', customer.id);
      onCustomersUpdated();
      toast({ title: 'Customer Deleted (Mock)', description: `Customer "${customer.name}" has been deleted.` });
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell>{customer.contactNumber}</TableCell>
      <TableCell>{customer.paymentTerms}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <CustomerDialog customer={customer} onSave={handleUpdate}>
            <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
          </CustomerDialog>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

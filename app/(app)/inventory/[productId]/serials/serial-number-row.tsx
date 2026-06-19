'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { SerialNumber } from '@/lib/types';

import { mockSerialNumbers } from './mock-serials';

function getStatusVariant(status: SerialNumber['status']) {
  switch (status) {
    case 'In Stock':
      return 'default';
    case 'Sold':
      return 'secondary';
    case 'Returned':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function SerialNumberRow({ serial, productId }: { serial: SerialNumber, productId: string }) {
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete serial number "${serial.id}"? This action cannot be undone and may affect your stock count.`)) {
      return;
    }

    try {
      // Remove from mock array
      const index = mockSerialNumbers.findIndex(s => s.id === serial.id && s.productId === productId);
      if (index !== -1) {
        mockSerialNumbers.splice(index, 1);
      }

      toast({
        title: "Serial Number Deleted",
        description: `Serial number "${serial.id}" has been removed.`
      });
    } catch (error: any) {
      console.error("Error deleting serial number:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "Could not delete the serial number."
      });
    }
  };

  return (
    <TableRow>
      <TableCell className="font-mono">{serial.id}</TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(serial.status)}>{serial.status}</Badge>
      </TableCell>
      <TableCell>{format(new Date(serial.dateAdded), 'PP p')}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={serial.status === 'Sold'}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

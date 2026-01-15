'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo, Trash2 } from 'lucide-react';
import type { SaleItem } from './page';

interface HeldTransactionsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  heldTransactions: SaleItem[][];
  onRestore: (index: number) => void;
  onDelete: (index: number) => void;
}

export function HeldTransactionsDialog({
  isOpen,
  onOpenChange,
  heldTransactions,
  onRestore,
  onDelete,
}: HeldTransactionsDialogProps) {

  const calculateTotal = (items: SaleItem[]) => {
    return items.reduce((acc, item) => acc + item.price * item.quantity * (1 - item.discount / 100), 0);
  };

  const calculateItemCount = (items: SaleItem[]) => {
    return items.reduce((acc, item) => acc + item.quantity, 0);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Held Transactions</DialogTitle>
          <DialogDescription>
            Select a transaction to restore it to the cart or delete it.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heldTransactions.length > 0 ? (
                heldTransactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{calculateItemCount(transaction)}</TableCell>
                    <TableCell>₱{calculateTotal(transaction).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRestore(index)}
                        >
                          <Undo className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(index)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No transactions on hold.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

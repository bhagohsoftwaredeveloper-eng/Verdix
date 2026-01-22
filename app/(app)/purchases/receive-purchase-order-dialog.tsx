import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PurchaseOrder } from '../../../lib/types';
import { Loader2 } from 'lucide-react';

interface ReceivePurchaseOrderDialogProps {
  order: PurchaseOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (receivedItems: { productId: string; quantity: number }[]) => Promise<void>;
}

export function ReceivePurchaseOrderDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
}: ReceivePurchaseOrderDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && order) {
      // Initialize with ordered quantities
      const initialQuantities = order.items.reduce((acc, item) => {
        acc[item.productId] = item.quantity;
        return acc;
      }, {} as Record<string, number>);
      setQuantities(initialQuantities);
    }
  }, [open, order]);

  const handleQuantityChange = (productId: string, value: string) => {
    const numValue = parseFloat(value);
    setQuantities((prev) => ({
      ...prev,
      [productId]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const receivedItems = Object.entries(quantities).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));
      await onConfirm(receivedItems);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receive Purchase Order #{order.id}</DialogTitle>
          <DialogDescription>
            Verify and confirm the quantities received. This will update your stock levels.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Ordered Qty</TableHead>
                <TableHead className="text-right w-[150px]">Received Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-muted-foreground">{item.productName}</div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="text-right"
                      value={quantities[item.productId] ?? ''}
                      onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

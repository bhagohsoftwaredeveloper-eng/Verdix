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
import { Loader2, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface BadItemInput {
  quantity: number;
  reason: string;
  description: string;
}

interface ReceivePurchaseOrderDialogProps {
  order: PurchaseOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    receivedItems: { productId: string; quantity: number }[],
    badItems?: { productId: string; productName: string; quantity: number; cost: number; reason: string; description: string }[]
  ) => Promise<void>;
}

export function ReceivePurchaseOrderDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
}: ReceivePurchaseOrderDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [badItems, setBadItems] = useState<Record<string, BadItemInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && order) {
      // Initialize with ordered quantities
      const initialQuantities = order.items.reduce((acc, item) => {
        acc[item.productId] = item.quantity;
        return acc;
      }, {} as Record<string, number>);
      setQuantities(initialQuantities);
      
      // Initialize bad items
      const initialBadItems = order.items.reduce((acc, item) => {
        acc[item.productId] = { quantity: 0, reason: 'Damaged', description: '' };
        return acc;
      }, {} as Record<string, BadItemInput>);
      setBadItems(initialBadItems);
    }
  }, [open, order]);

  const handleQuantityChange = (productId: string, value: string) => {
    const numValue = parseFloat(value);
    setQuantities((prev) => ({
      ...prev,
      [productId]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleBadQtyChange = (productId: string, value: string) => {
    const numValue = parseFloat(value);
    setBadItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: isNaN(numValue) ? 0 : numValue,
      },
    }));
  };

  const handleBadReasonChange = (productId: string, value: string) => {
    setBadItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        reason: value,
      },
    }));
  };

  const handleBadDescriptionChange = (productId: string, value: string) => {
    setBadItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        description: value,
      },
    }));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const receivedItems = Object.entries(quantities).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));

      const reportedBadItems = Object.entries(badItems)
        .filter(([_, data]) => data.quantity > 0)
        .map(([productId, data]) => {
          const originalItem = order.items.find((i) => i.productId === productId);
          return {
            productId,
            productName: originalItem?.productName || 'Unknown Product',
            quantity: data.quantity,
            cost: originalItem?.cost || 0,
            reason: data.reason,
            description: data.description,
          };
        });

      await onConfirm(receivedItems, reportedBadItems.length > 0 ? reportedBadItems : undefined);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Purchase Order #{order.referenceNumber || order.id.substring(0, 8).toUpperCase()}</DialogTitle>
          <DialogDescription>
            Verify and confirm the quantities received. If there are damaged or defective items, record them as bad items.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Product</TableHead>
                <TableHead className="text-right w-[100px]">Ordered</TableHead>
                <TableHead className="text-right w-[120px]">Good Qty</TableHead>
                <TableHead className="text-right w-[120px]">Bad Qty</TableHead>
                <TableHead className="w-[150px]">Reason</TableHead>
                <TableHead>Issue Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>
                    <div className="font-medium text-xs truncate max-w-[180px]" title={item.productName}>
                      {item.productName}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="text-right h-8 text-xs"
                      value={quantities[item.productId] ?? ''}
                      onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="text-right h-8 text-xs border-destructive/50 focus-visible:ring-destructive"
                      value={badItems[item.productId]?.quantity || ''}
                      onChange={(e) => handleBadQtyChange(item.productId, e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={badItems[item.productId]?.reason || 'Damaged'} 
                      onValueChange={(val) => handleBadReasonChange(item.productId, val)}
                      disabled={!(badItems[item.productId]?.quantity > 0)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                        <SelectItem value="Defective">Defective</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                        <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                        <SelectItem value="Missing">Missing</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Optional notes..."
                      className="h-8 text-xs"
                      value={badItems[item.productId]?.description || ''}
                      onChange={(e) => handleBadDescriptionChange(item.productId, e.target.value)}
                      disabled={!(badItems[item.productId]?.quantity > 0)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {Object.values(badItems).some(item => item.quantity > 0) && (
          <div className="mx-1 my-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-xs font-medium">
              You have marked items as bad. A "Bad Order" record will be automatically created for these items.
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
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

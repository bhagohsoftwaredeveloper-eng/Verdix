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
import { Loader2, AlertCircle, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { calculatePurchaseCosts } from '../../../lib/purchase-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toSafeNumber } from '@/lib/utils';

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
    receivedItems: { productId: string; quantity: number; expirationDate?: string }[],
    badItems?: { productId: string; productName: string; quantity: number; cost: number; reason: string; description: string }[],
    allocationStrategy?: 'equal' | 'proportional'
  ) => Promise<void>;
  requireConfirmation?: boolean;
}

export function ReceivePurchaseOrderDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  requireConfirmation,
}: ReceivePurchaseOrderDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [badItems, setBadItems] = useState<Record<string, BadItemInput>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [allocationStrategy, setAllocationStrategy] = useState<'equal' | 'proportional'>('equal');

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

      // Initialize expiry dates
      const initialExpiryDates = order.items.reduce((acc, item) => {
        acc[item.productId] = '';
        return acc;
      }, {} as Record<string, string>);
      setExpiryDates(initialExpiryDates);
    }
  }, [open, order]);

  const handleQuantityChange = (productId: string, value: string) => {
    const numValue = parseFloat(value);
    setQuantities((prev) => ({
      ...prev,
      [productId]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleExpiryDateChange = (productId: string, value: string) => {
    setExpiryDates((prev) => ({
      ...prev,
      [productId]: value,
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
    if (requireConfirmation && !isConfirmOpen) {
      setIsConfirmOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const receivedItems = Object.entries(quantities).map(([productId, quantity]) => ({
        productId,
        quantity,
        expirationDate: expiryDates[productId] || undefined,
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

      await onConfirm(receivedItems, reportedBadItems.length > 0 ? reportedBadItems : undefined, allocationStrategy);
      onOpenChange(false);
      setIsConfirmOpen(false);
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
          <DialogDescription asChild>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Verify and confirm the quantities received. If there are damaged or defective items, record them as bad items.</span>
              {toSafeNumber(order.shippingFee) > 0 && (
                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md border">
                  <span className="text-xs font-semibold">Allocation Strategy:</span>
                  <Select 
                    value={allocationStrategy} 
                    onValueChange={(val: any) => setAllocationStrategy(val)}
                  >
                    <SelectTrigger className="h-7 text-[10px] w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equal" className="text-[10px]">Equal Per Line</SelectItem>
                      <SelectItem value="proportional" className="text-[10px]">Proportional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Product</TableHead>
                <TableHead className="text-right w-[80px]">Ordered</TableHead>
                <TableHead className="text-right w-[100px]">Cost</TableHead>
                <TableHead className="text-right w-[100px]">
                  <div className="flex items-center justify-end gap-1">
                    Landed Cost
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                         Landed Cost includes the shipping fee allocation. This will be the new inventory cost for this item.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead className="text-right w-[100px]">Good Qty</TableHead>
                <TableHead className="w-[130px]">Expiry Date</TableHead>
                <TableHead className="text-right w-[100px]">Bad Qty</TableHead>
                <TableHead className="w-[120px]">Reason</TableHead>
                <TableHead>Issue Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const calculations = calculatePurchaseCosts(
                  order.items.map(i => ({ 
                    productId: i.productId, 
                    productName: i.productName, 
                    quantity: i.quantity, 
                    cost: i.cost, 
                    discount: i.discount || 0, 
                    discountType: (i.discountType as any) || 'amount', 
                    vatSubject: i.vatSubject 
                  })), 
                  order.shippingFee || 0, 
                  12, 
                  allocationStrategy
                );

                return order.items.map((item) => {
                  const calculated = calculations.items.find(ci => ci.productId === item.productId);
                  const landedCost = calculated?.landedCostPerUnit || item.cost;

                  return (
                    <TableRow key={item.productId}>
                      <TableCell>
                        <div className="font-medium text-xs truncate max-w-[170px]" title={item.productName}>
                          {item.productName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">₱{toSafeNumber(item.cost).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-primary">₱{toSafeNumber(landedCost).toFixed(2)}</TableCell>
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
                      type="date"
                      className="h-8 text-xs"
                      value={expiryDates[item.productId] || ''}
                      onChange={(e) => handleExpiryDateChange(item.productId, e.target.value)}
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
                  );
                });
              })()}
            </TableBody>
          </Table>
          </TooltipProvider>
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

        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Receipt</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to confirm receipt for <strong>PO #{order.referenceNumber || order.id.substring(0, 8).toUpperCase()}</strong>?
                Inventory levels will be updated immediately.
                {Object.values(badItems).some(item => item.quantity > 0) && (
                  <span className="block mt-2 font-bold text-destructive">
                    Warning: You are also recording bad/damaged items.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm & Update Stock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

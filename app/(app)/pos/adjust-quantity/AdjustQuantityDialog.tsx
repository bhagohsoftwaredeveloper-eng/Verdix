'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatQuantity } from '@/lib/utils';
import { useAdjustQuantity } from './use-adjust-quantity';
import type { AdjustQuantityDialogProps } from './adjust-quantity-types';

export function AdjustQuantityDialog({ isOpen, onOpenChange, item, onUpdate }: AdjustQuantityDialogProps) {
  const { adjustment, setAdjustment, resultingQty, handleConfirm, handleKeyDown } =
    useAdjustQuantity({ isOpen, item, onUpdate, onOpenChange });

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Quantity</DialogTitle>
          <DialogDescription>For item: {item.name}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="adj-product-name">Product Name</Label>
            <Input id="adj-product-name" value={item.name} readOnly className="col-span-1 bg-muted" />
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="adj-price">Price</Label>
            <Input id="adj-price" value={`₱${item.price.toFixed(2)}`} readOnly className="col-span-1 bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adj-adjustment">Adjustment (+ / -)</Label>
              <Input
                id="adj-adjustment"
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adj-resulting-qty">Resulting Quantity</Label>
              <Input
                id="adj-resulting-qty"
                value={formatQuantity(resultingQty, item.unitOfMeasure)}
                readOnly
                className="bg-muted font-bold"
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            Current: <span className="font-medium text-foreground">{formatQuantity(item.quantity, item.unitOfMeasure)}</span>
            &nbsp;→&nbsp;
            New: <span className="font-medium text-foreground">{formatQuantity(resultingQty, item.unitOfMeasure)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleConfirm}>Confirm (Enter)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

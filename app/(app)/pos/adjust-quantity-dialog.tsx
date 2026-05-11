
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SaleItem } from './page';
import { formatQuantity } from '@/lib/utils';

interface AdjustQuantityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onUpdate: (itemId: string, newQuantity: number) => void;
}

export function AdjustQuantityDialog({ 
  isOpen, 
  onOpenChange,
  item, 
  onUpdate, 
}: AdjustQuantityDialogProps) {
  const [adjustment, setAdjustment] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAdjustment('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (item) {
      const adj = parseFloat(adjustment) || 0;
      const newQuantity = item.quantity + adj;
      onUpdate(item.id, newQuantity);
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };
  
  if (!item) return null;

  const adj = parseFloat(adjustment) || 0;
  const resultingQty = Math.max(0, item.quantity + adj);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Quantity</DialogTitle>
          <DialogDescription>
            For item: {item.name}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor="product-name">Product Name</Label>
                <Input id="product-name" value={item.name} readOnly className="col-span-1 bg-muted" />
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
                 <Label htmlFor="price">Price</Label>
                <Input id="price" value={`₱${item.price.toFixed(2)}`} readOnly className="col-span-1 bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="adjustment">Adjustment (+ / -)</Label>
                    <Input
                        id="adjustment"
                        type="number"
                        value={adjustment}
                        onChange={(e) => setAdjustment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="0"
                        autoFocus
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="resulting-qty">Resulting Quantity</Label>
                    <Input
                        id="resulting-qty"
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
          >
            Confirm (Enter)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

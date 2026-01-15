
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
  const [addQty, setAddQty] = useState('');
  const [removeQty, setRemoveQty] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAddQty('');
      setRemoveQty('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (item) {
      const toAdd = parseInt(addQty, 10) || 0;
      const toRemove = parseInt(removeQty, 10) || 0;
      const newQuantity = item.quantity + toAdd - toRemove;
      onUpdate(item.id, newQuantity);
      onOpenChange(false);
    }
  };
  
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Quantity</DialogTitle>
          <DialogDescription>
            For item: {item.name} (Current: {item.quantity})
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
                    <Label htmlFor="add-qty">Quantity to Add</Label>
                    <Input
                        id="add-qty"
                        type="number"
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value)}
                        placeholder="0"
                        autoFocus
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="remove-qty">Quantity to Remove</Label>
                    <Input
                        id="remove-qty"
                        type="number"
                        value={removeQty}
                        onChange={(e) => setRemoveQty(e.target.value)}
                        placeholder="0"
                    />
                </div>
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
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

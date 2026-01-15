
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
import { useToast } from '@/hooks/use-toast';

interface EditItemDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onUpdate: (itemId: string, newName: string, newQuantity: number, newPrice: number, newDiscount: number) => void;
  mode?: 'full' | 'price-only';
}

export function EditItemDialog({
  isOpen,
  onOpenChange,
  item,
  onUpdate,
  mode = 'full'
}: EditItemDialogProps) {
  const [name, setName] = useState(item?.name || '');
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [price, setPrice] = useState(item?.price || 0);
  const [discount, setDiscount] = useState(item?.discount || 0);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && item) {
      setName(item.name);
      setQuantity(item.quantity);
      setPrice(item.price);
      setDiscount(item.discount);
    }
  }, [isOpen, item]);

  const save = () => {
    if (item) {
      // Ensure all values are properly typed
      const validQuantity = Math.max(1, Number(quantity) || 1);
      const validPrice = Math.max(0, Number(price) || 0);
      const validDiscount = Math.max(0, Number(discount) || 0);

      try {
        onUpdate(item.id, name, validQuantity, validPrice, validDiscount);
        onOpenChange(false);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update item details.",
          variant: "destructive",
        });
      }
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item: {item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base">Product Name</Label>
            <Input
              id="name"
              value={name}
              readOnly
              className="bg-muted"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-base">Price (₱)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                autoFocus={mode === 'price-only'}
              />
            </div>
          </div>
          {mode === 'full' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-base">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount" className="text-base">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

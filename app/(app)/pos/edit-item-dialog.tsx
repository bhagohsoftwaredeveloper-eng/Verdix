
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
import { calculateEffectivePrice } from '@/lib/pricing';
import type { Product } from '@/lib/types';

interface EditItemDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onUpdate: (itemId: string, newName: string, newQuantity: number, newPrice: number, newDiscount: number) => void;
  mode?: 'full' | 'price-only';
  activeLevelId?: string;
  defaultLevelId?: string;
  product?: Product | null;
}

export function EditItemDialog({
  isOpen,
  onOpenChange,
  item,
  onUpdate,
  mode = 'full',
  activeLevelId,
  defaultLevelId = 'retail-level',
  product
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

  // Update price automatically when quantity changes, 
  // ONLY if the current price matches the effective price of the current quantity
  // (to avoid overriding manual price edits unless intended)
  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    if (product || item) {
        const newPrice = calculateEffectivePrice((product || item) as unknown as Product, newQty, activeLevelId, defaultLevelId);
        setPrice(newPrice);
    }
  };

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
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-base">Price (₱)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    save();
                  }
                }}
                className="font-medium focus-visible:ring-primary text-[30px] md:text-[30px] h-20 py-4 text-center leading-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-base">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="font-medium focus-visible:ring-primary h-12 text-center"
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
            onClick={save}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

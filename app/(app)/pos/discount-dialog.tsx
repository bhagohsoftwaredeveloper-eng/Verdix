
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Percent, Banknote, UserRound, Accessibility } from 'lucide-react';
import type { SaleItem } from './page';

interface DiscountDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onApplyDiscount: (itemId: string | 'ALL', discountPercentage: number) => void;
  hasItems: boolean;
}

type DiscountType = 'percent' | 'amount' | 'pwd' | 'senior';

export function DiscountDialog({
  isOpen,
  onOpenChange,
  item,
  onApplyDiscount,
  hasItems
}: DiscountDialogProps) {
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [scope, setScope] = useState<'selected' | 'all'>('selected');
  const [value, setValue] = useState<string>('0');

  useEffect(() => {
    if (isOpen) {
      setDiscountType('percent');
      setScope('selected');
      setValue(item?.discount.toString() || '0');
    }
  }, [isOpen, item]);

  const handleApply = () => {
    let percentage = 0;
    
    if (discountType === 'pwd' || discountType === 'senior') {
      percentage = 20;
    } else {
      const numValue = parseFloat(value) || 0;
      if (discountType === 'percent') {
        percentage = Math.min(100, Math.max(0, numValue));
      } else if (item) {
        // Fixed amount is only allowed for selected item
        const totalItemPrice = item.price * item.quantity;
        if (totalItemPrice > 0) {
          percentage = (numValue / totalItemPrice) * 100;
          percentage = Math.min(100, Math.max(0, percentage));
        }
      }
    }

    if (scope === 'all') {
      onApplyDiscount('ALL', percentage);
    } else if (item) {
      onApplyDiscount(item.id, percentage);
    }
    onOpenChange(false);
  };

  if (!hasItems) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[300px] p-6">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-bold text-blue-600">Discounts</DialogTitle>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {scope === 'all' ? 'Apply to all items in cart' : `Applying to: ${item?.name || 'Selected Item'}`}
          </div>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Scope Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Button
              type="button"
              variant={scope === 'selected' ? 'secondary' : 'ghost'}
              className={`flex-1 h-8 text-[10px] uppercase font-bold transition-all ${scope === 'selected' ? 'bg-white shadow-sm hover:bg-white text-blue-600' : 'text-slate-500'}`}
              onClick={() => setScope('selected')}
              disabled={!item}
            >
              Selected
            </Button>
            <Button
              type="button"
              variant={scope === 'all' ? 'secondary' : 'ghost'}
              className={`flex-1 h-8 text-[10px] uppercase font-bold transition-all ${scope === 'all' ? 'bg-white shadow-sm hover:bg-white text-blue-600' : 'text-slate-500'}`}
              onClick={() => {
                setScope('all');
                setDiscountType('percent'); // Amount not supported for 'all'
              }}
            >
              All Items
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-500 font-medium">Discount Type</Label>
            <Select 
              value={discountType} 
              onValueChange={(val: DiscountType) => {
                setDiscountType(val);
                if (val === 'pwd' || val === 'senior') {
                  setValue('20');
                } else if (val === 'percent' && item && (discountType === 'pwd' || discountType === 'senior')) {
                    setValue(item.discount.toString());
                }
              }}
            >
              <SelectTrigger className="w-full h-11 border-slate-200">
                <SelectValue placeholder="Select discount type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-blue-500" />
                    <span>Percentage (%)</span>
                  </div>
                </SelectItem>
                {scope === 'selected' && (
                  <SelectItem value="amount">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-green-500" />
                      <span>Fixed Amount (₱)</span>
                    </div>
                  </SelectItem>
                )}
                <SelectItem value="senior">
                  <div className="flex items-center gap-2">
                    <UserRound className="w-4 h-4 text-orange-500" />
                    <span>Senior Citizen (20%)</span>
                  </div>
                </SelectItem>
                <SelectItem value="pwd">
                  <div className="flex items-center gap-2">
                    <Accessibility className="w-4 h-4 text-purple-500" />
                    <span>PWD Discount (20%)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-500 font-medium">
              {discountType === 'pwd' || discountType === 'senior' ? 'Fixed Percentage' : `Value to Subtract`}
            </Label>
            <div className="relative">
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`text-center text-xl font-mono h-14 border-2 pl-10 focus-visible:ring-blue-500 ${
                  (discountType === 'pwd' || discountType === 'senior') ? 'bg-slate-50 text-slate-400' : ''
                }`}
                readOnly={discountType === 'pwd' || discountType === 'senior'}
                autoFocus={discountType !== 'pwd' && discountType !== 'senior'}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-600 font-bold text-lg">
                {discountType === 'amount' ? '₱' : '%'}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center gap-2 pt-0">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 text-white" onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

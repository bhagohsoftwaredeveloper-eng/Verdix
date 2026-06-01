
'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
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
  onApplyDiscount: (itemId: string | 'ALL', discountPercentage: number, discountType?: string) => void;
  hasItems: boolean;
}

type DiscountType = 'percent' | 'amount' | 'pwd' | 'senior' | 'naac' | 'solo_parent';

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
    
    if (discountType === 'pwd' || discountType === 'senior' || discountType === 'naac') {
      percentage = 20;
    } else if (discountType === 'solo_parent') {
      percentage = 10;
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
      onApplyDiscount('ALL', percentage, discountType);
    } else if (item) {
      onApplyDiscount(item.id, percentage, discountType);
    }
    onOpenChange(false);
  };

  if (!hasItems) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[380px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-white p-6 space-y-6">
          <SheetHeader className="space-y-3">
            <div className="flex justify-center">
              <div className="bg-blue-50 p-3 rounded-2xl">
                <Percent className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <SheetTitle className="text-2xl font-extrabold text-center text-slate-800">
              Discounts
            </SheetTitle>
            <SheetDescription className="sr-only">Apply a discount to the selected item or all cart items</SheetDescription>
            <div className="text-sm text-slate-500 text-center bg-slate-50 py-2 px-3 rounded-lg border border-slate-100 truncate">
              {scope === 'all' ? 'Apply to all items in cart' : `Item: ${item?.name || 'Selected Item'}`}
            </div>
          </SheetHeader>
          
          <div className="space-y-5">
            {/* Scope Toggle */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
              <Button
                type="button"
                variant="ghost"
                className={`flex-1 h-10 text-xs uppercase font-bold tracking-wider transition-all duration-200 rounded-lg ${
                  scope === 'selected' 
                    ? 'bg-white shadow-sm text-blue-600 ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:bg-white/50'
                }`}
                onClick={() => setScope('selected')}
                disabled={!item}
              >
                Selected
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`flex-1 h-10 text-xs uppercase font-bold tracking-wider transition-all duration-200 rounded-lg ${
                  scope === 'all' 
                    ? 'bg-white shadow-sm text-blue-600 ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:bg-white/50'
                }`}
                onClick={() => {
                  setScope('all');
                  setDiscountType('percent');
                }}
              >
                All Items
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-tight ml-1">Discount Type</Label>
              <Select 
                value={discountType} 
                onValueChange={(val: DiscountType) => {
                  setDiscountType(val);
                  if (val === 'pwd' || val === 'senior' || val === 'naac') {
                    setValue('20');
                  } else if (val === 'solo_parent') {
                    setValue('10');
                  } else if (val === 'percent' && item && (discountType === 'pwd' || discountType === 'senior' || discountType === 'naac' || discountType === 'solo_parent')) {
                      setValue(item.discount.toString());
                  }
                }}
              >
                <SelectTrigger className="w-full h-12 border-slate-200 rounded-xl focus:ring-blue-500 bg-slate-50/30">
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                  <SelectItem value="percent" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-blue-100 p-1.5 rounded-md">
                        <Percent className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-slate-700">Percentage (%)</span>
                    </div>
                  </SelectItem>
                  {scope === 'selected' && (
                    <SelectItem value="amount" className="rounded-lg">
                      <div className="flex items-center gap-3 py-1">
                        <div className="bg-green-100 p-1.5 rounded-md">
                          <Banknote className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="font-medium text-slate-700">Fixed Amount (₱)</span>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="senior" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-orange-100 p-1.5 rounded-md">
                        <UserRound className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="font-medium text-slate-700">Senior Citizen (20%)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pwd" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-purple-100 p-1.5 rounded-md">
                        <Accessibility className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="font-medium text-slate-700">PWD Discount (20%)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="naac" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-teal-100 p-1.5 rounded-md">
                        <UserRound className="w-4 h-4 text-teal-600" />
                      </div>
                      <span className="font-medium text-slate-700">NAAC Discount (20%)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="solo_parent" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-pink-100 p-1.5 rounded-md">
                        <UserRound className="w-4 h-4 text-pink-600" />
                      </div>
                      <span className="font-medium text-slate-700">Solo Parent Discount (10%)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-tight ml-1">
                {['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType) ? 'Fixed Rate' : `Value to Subtract`}
              </Label>
              <div className="relative group">
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={`text-center text-3xl font-black h-20 border-2 rounded-2xl transition-all duration-200 focus-visible:ring-blue-500 focus:border-blue-500 ${
                    ['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType) 
                      ? 'bg-slate-100 border-slate-200 text-slate-400' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  readOnly={['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType)}
                  autoFocus={!['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                />
                <div className={`absolute left-6 top-1/2 -translate-y-1/2 font-bold text-2xl transition-colors duration-200 ${
                  ['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType) ? 'text-slate-300' : 'text-blue-600'
                }`}>
                  {discountType === 'amount' ? '₱' : '%'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 h-12 rounded-xl font-bold text-slate-600 border-slate-200 hover:bg-slate-50 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 transition-all active:scale-[0.98]" 
              onClick={handleApply}
            >
              Apply Discount
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


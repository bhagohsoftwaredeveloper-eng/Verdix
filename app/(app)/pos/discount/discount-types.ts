import type { SaleItem } from '../pos-content/pos-types';

export interface DiscountDetails {
  idNumber?: string;
  holderName?: string;
}

export interface DiscountDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onApplyDiscount: (itemId: string | 'ALL', discountPercentage: number, discountType?: string, discountDetails?: DiscountDetails) => void;
  hasItems: boolean;
}

export type DiscountType = 'percent' | 'amount' | 'pwd' | 'senior' | 'naac' | 'solo_parent';

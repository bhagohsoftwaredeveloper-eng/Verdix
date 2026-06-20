import type { SaleItem } from '../pos-content/pos-types';
import type { Product } from '@/lib/types';

export interface EditItemDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onUpdate: (itemId: string, newName: string, newQuantity: number, newPrice: number, newDiscount: number) => void;
  mode?: 'full' | 'price-only';
  activeLevelId?: string;
  defaultLevelId?: string;
  product?: Product | null;
}

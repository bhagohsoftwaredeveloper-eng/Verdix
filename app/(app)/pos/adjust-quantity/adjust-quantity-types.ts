import type { SaleItem } from '../pos-content/pos-types';

export interface AdjustQuantityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onUpdate: (itemId: string, newQuantity: number) => void;
}

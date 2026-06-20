import type { SaleItem } from '../pos-content/pos-types';

export interface InsufficientStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SaleItem[];
}

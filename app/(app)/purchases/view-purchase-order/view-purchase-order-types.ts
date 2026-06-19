import { PurchaseOrder } from '@/lib/types';

export interface ViewPurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder | null;
}

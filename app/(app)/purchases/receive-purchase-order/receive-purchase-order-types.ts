import { PurchaseOrder } from '@/lib/types';

export interface BadItemInput {
  quantity: number;
  reason: string;
  description: string;
}

export interface ReceivePurchaseOrderDialogProps {
  order: PurchaseOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    receivedItems: { productId: string; quantity: number; expirationDate?: string }[],
    badItems?: { productId: string; productName: string; quantity: number; cost: number; reason: string; description: string }[],
    allocationStrategy?: 'equal' | 'proportional',
  ) => Promise<void>;
  requireConfirmation?: boolean;
}

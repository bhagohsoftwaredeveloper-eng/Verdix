import type { Sale } from '@/lib/types';

export type OrderDialogMode = 'order' | 'delivery-note' | 'invoice';

export interface POSSettings {
  businessName?: string;
  logoPath?: string;
  address?: string;
  contactNumber?: string;
  tin?: string;
  salesOrderTerms?: string;
}

export interface OrderDetailsDialogProps {
  order: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: OrderDialogMode;
}

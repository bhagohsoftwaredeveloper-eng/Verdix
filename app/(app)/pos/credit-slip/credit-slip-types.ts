import type { SaleItem, SystemSettings } from '@/lib/types';

export interface CreditSlipViewProps {
  creditDetails: {
    creditSlipId: string;
    originalSoNumber: string;
    customerName: string;
    date: string;
    expiryDate: string;
    cashierName: string;
    items: SaleItem[];
    totalAmount: number;
  };
  settings?: SystemSettings | null;
}

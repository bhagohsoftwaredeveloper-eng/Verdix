import type { Customer, SystemSettings } from '@/lib/types';

export interface CustomerAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectCustomer: (customer: Customer | null) => void;
  initialCustomer?: Customer | null;
  printMode?: 'browser' | 'escpos' | 'usb' | 'native';
  settings?: SystemSettings | null;
  posUserId?: string;
  posCashierName?: string;
}

export const WALK_IN_CUSTOMER: Customer = {
  id: 'walk-in',
  name: 'Walk-in Customer',
  contactNumber: '',
  paymentTerms: 'Due on receipt',
};

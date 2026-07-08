import type { Sale } from '@/lib/types';

export interface VoidSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export type VoidStep = 'loading' | 'auth' | 'input_so' | 'select_items';

export interface PosSettings {
  enableVoidReturnAuth?: boolean;
  printMode?: 'browser' | 'escpos' | 'usb' | 'native' | 'none';
  nativePrinterName?: string;
}

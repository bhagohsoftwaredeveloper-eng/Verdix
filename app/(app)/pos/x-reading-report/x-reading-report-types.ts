export interface XReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId?: string;
  autoShow?: boolean;
  terminalName?: string;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
}

export interface ZReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  terminalId?: string;
  terminalName?: string;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
  initialData?: any;
  autoShow?: boolean;
}

export type PrinterMode = 'browser' | 'escpos' | 'usb' | 'native' | 'epson';

export interface ConnectionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ShiftTakeoverDialogProps {
  isOpen: boolean;
  onContinue: () => void;
  onStartNew: () => void;
  previousCashierName: string;
}

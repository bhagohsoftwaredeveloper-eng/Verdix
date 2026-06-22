export interface StartShiftDialogProps {
  isOpen: boolean;
  onShiftStart: (totalCash: number) => void;
  onCancel: () => void;
}

export interface Denomination {
  value: number;
  label: string;
}

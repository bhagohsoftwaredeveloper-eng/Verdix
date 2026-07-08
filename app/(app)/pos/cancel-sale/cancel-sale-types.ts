export interface CancelSaleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCancelSelected: (quantity: number) => void;
  onCancelAll: () => void;
  selectedItem: any | null;
}

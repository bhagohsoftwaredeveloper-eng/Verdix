import type { SuspendedTransaction } from '../pos-content/pos-types';

export interface HeldTransactionsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  heldTransactions: SuspendedTransaction[];
  onRestore: (index: number) => void;
  onDelete: (index: number) => void;
}

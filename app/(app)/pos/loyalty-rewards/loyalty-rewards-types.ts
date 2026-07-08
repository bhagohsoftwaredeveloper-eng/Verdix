import type { Customer } from '@/lib/types';

export interface LoyaltyRewardsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

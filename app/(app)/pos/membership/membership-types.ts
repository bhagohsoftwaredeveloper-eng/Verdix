import type { Customer } from '@/lib/types';

export interface MembershipPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomer?: Customer | null;
  shiftId?: string | null;
  terminalId?: string | null;
  userId: string;
}

export interface MembershipResult {
  membershipPaymentId: string;
  loyaltyId: string;
  receiptNumber: string;
  amount: number;
  previousExpiry: string | null;
  newExpiry: string;
  isNewCard: boolean;
  customerName: string;
  rfidCode: string | null;
}

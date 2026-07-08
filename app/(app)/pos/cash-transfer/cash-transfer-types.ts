import { z } from 'zod';

export const transferSchema = z.object({
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  reason: z.string().min(3, 'A reason is required (min. 3 characters).'),
});

export type TransferFormValues = z.infer<typeof transferSchema>;

export interface CashTransferDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  shiftId: string | null;
  terminalId: string;
  userId: string;
}

import { z } from 'zod';

export const paymentTermSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  type: z.string().min(1, 'Type is required'),
  numberOfDaysMonth: z.string().optional(),
});

export type PaymentTermFormValues = z.infer<typeof paymentTermSchema>;

export interface ManagePaymentTermsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPaymentTermsUpdated?: () => void;
  trigger?: React.ReactNode;
}

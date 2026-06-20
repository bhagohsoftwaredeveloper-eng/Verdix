import { z } from 'zod';

export const paymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

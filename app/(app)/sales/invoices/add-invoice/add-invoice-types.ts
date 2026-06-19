import { z } from 'zod';

export const salesInvoiceItemSchema = z.object({
  product: z.any(),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().nonnegative(),
});

export const salesInvoiceSchema = z.object({
  customer: z.any().refine(val => val && typeof val === 'object' && val.id, 'Customer is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  deliveryDate: z.string().optional(),
  dueDate: z.string().optional(),
  reference: z.string().optional(),
  paymentReference: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  shipping: z.coerce.number().nonnegative().optional(),
  warehouse: z.string().optional(),
  note: z.string().optional(),
  items: z.array(salesInvoiceItemSchema).min(1, 'At least one item is required'),
});

export type SalesInvoiceFormValues = z.infer<typeof salesInvoiceSchema>;

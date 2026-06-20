import { z } from 'zod';

export const transactionReferenceSchema = z.object({
  salesOrder: z.string().optional(),
  purchaseOrder: z.string().optional(),
  salesDelivery: z.string().optional(),
  paymentToSupplier: z.string().optional(),
  salesInvoice: z.string().optional(),
  customerPayment: z.string().optional(),
  deliveryReceipt: z.string().optional(),
  stockAdjustment: z.string().optional(),
  salesHold: z.string().optional(),
  receiptNumber: z.string().optional(),
});

export type TransactionReferenceFormValues = z.infer<typeof transactionReferenceSchema>;

export interface LastReferences {
  salesOrder: string | null;
  purchaseOrder: string | null;
  salesDelivery: string | null;
  paymentToSupplier: string | null;
  salesInvoice: string | null;
  customerPayment: string | null;
  deliveryReceipt: string | null;
  stockAdjustment: string | null;
  salesHold: string | null;
  receiptNumber: string | null;
}

export const REFERENCE_FIELDS: {
  name: keyof TransactionReferenceFormValues;
  label: string;
  placeholder?: string;
  lastLabel?: string;
}[] = [
  { name: 'salesOrder',        label: 'Sales Order' },
  { name: 'purchaseOrder',     label: 'Purchase Order' },
  { name: 'salesDelivery',     label: 'Sales Delivery' },
  { name: 'paymentToSupplier', label: 'Payment To Supplier' },
  { name: 'salesInvoice',      label: 'Sales Invoice' },
  { name: 'customerPayment',   label: 'Customer Payment' },
  { name: 'deliveryReceipt',   label: 'Delivery Receipt' },
  { name: 'stockAdjustment',   label: 'Stock Adjustment' },
  { name: 'salesHold',         label: 'Sales Hold' },
  { name: 'receiptNumber',     label: 'Next Receipt Number (Global)', placeholder: 'Next receipt number', lastLabel: 'Current counter:' },
];

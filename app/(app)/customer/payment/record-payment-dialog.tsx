'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Sale, PaymentMethod } from '@/lib/types';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
    { id: 'pm_1', name: 'Cash' },
    { id: 'pm_2', name: 'Credit Card' },
    { id: 'pm_3', name: 'Bank Transfer' },
    { id: 'pm_4', name: 'GCash' },
    { id: 'pm_5', name: 'Check' },
];

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be positive.'),
  paymentMethod: z.string().min(1, 'Payment method is required.'),
  paymentDate: z.date(),
  reference: z.string().optional(),
  depositAccount: z.string().min(1, 'Deposit account is required.'),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface RecordPaymentDialogProps {
  sale: Sale;
  children?: React.ReactNode;
  onSuccess?: () => void;
}

export default function RecordPaymentDialog({ sale, children, onSuccess }: RecordPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true);
  const [depositAccounts, setDepositAccounts] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingDepositAccounts, setIsLoadingDepositAccounts] = useState(true);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handlePrintReceipt = (paymentDate: Date, amount: number, paymentMethod: string, reference?: string) => {
      const printWindow = window.open('', '', 'height=800,width=800');
      if (!printWindow) return;

      printWindow.document.write('<html><head><title>Payment Receipt ' + sale.id + '</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 1px solid #ddd; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .subtitle { color: #666; font-size: 14px; }
        .content { margin-bottom: 30px; font-size: 16px; line-height: 1.6; }
        .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .label { font-weight: bold; color: #555; }
        .value { text-align: right; }
        .amount { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; border: 2px solid #000; padding: 10px; border-radius: 8px; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; }
      `);
      printWindow.document.write('</style></head><body>');

      printWindow.document.write(`
        <div class="header">
          <div class="title">OFFICIAL RECEIPT</div>
          <div class="subtitle">Stock Pilot POS System</div>
        </div>

        <div class="content">
          <div class="row">
            <span class="label">Invoice Ref:</span>
            <span class="value">${sale.id}</span>
          </div>
          <div class="row">
            <span class="label">Received From:</span>
            <span class="value">${sale.customer.name}</span>
          </div>
           <div class="row">
            <span class="label">Date:</span>
            <span class="value">${format(paymentDate, 'PP p')}</span>
          </div>
          <div class="row">
            <span class="label">Payment Method:</span>
            <span class="value">${paymentMethod}</span>
          </div>
          ${reference ? `
          <div class="row">
            <span class="label">Reference No:</span>
            <span class="value">${reference}</span>
          </div>` : ''}
          
          <div class="amount">
            <div style="font-size: 14px; color: #666; font-weight: normal; text-transform: uppercase; margin-bottom: 5px;">Amount Paid</div>
            ₱${amount.toFixed(2)}
          </div>
        </div>

        <div class="footer">
          This is a system generated receipt.
        </div>
      `);

      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowPrintConfirm(false);
    form.reset();
    if (onSuccess) onSuccess();
    window.location.reload(); 
  };

  useEffect(() => {
    // Simulate fetching payment methods
    // TODO: Fetch from real API when available
    setIsLoadingPaymentMethods(true);
    setTimeout(() => {
        setPaymentMethods(MOCK_PAYMENT_METHODS);
        setIsLoadingPaymentMethods(false);
    }, 300);

    // Simulate fetching deposit accounts
    // TODO: Fetch from real API when available
    setIsLoadingDepositAccounts(true);
    setTimeout(() => {
        setDepositAccounts([
            { id: 'da_1', name: 'Cash On Hand' },
            { id: 'da_2', name: 'BDO Savings' },
            { id: 'da_3', name: 'BPI Checking' },
            { id: 'da_4', name: 'Petty Cash Fund' },
        ]);
        setIsLoadingDepositAccounts(false);
    }, 300);
  }, []);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: sale.total,
      paymentMethod: '',
      paymentDate: new Date(),
      reference: '',
      depositAccount: '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: PaymentFormValues) {
    if (values.amount !== sale.total) {
        toast({
            variant: 'destructive',
            title: 'Incorrect Amount',
            description: `Payment amount must be exactly ₱${Number(sale.total).toFixed(2)}. Partial payments will be supported in a future update.`,
        });
        return;
    }

    try {
        const response = await fetch(`/api/customers/invoices/${sale.id}/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
        });

        const result = await response.json();

        if (result.success) {
            toast({
                title: 'Payment Recorded',
                description: `Payment of ₱${values.amount.toFixed(2)} for invoice ${sale.id} has been successfully recorded.`,
            });
            setShowPrintConfirm(true); // Trigger confirmation dialog
        } else {
             toast({
                variant: 'destructive',
                title: 'Payment Failed',
                description: result.error || 'Failed to record payment.',
            });
        }
    } catch (error) {
        console.error('Payment submission error:', error);
         toast({
            variant: 'destructive',
            title: 'Payment Error',
            description: 'An unexpected error occurred while recording the payment.',
        });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children ? children : (
            <Button size="sm">
                <ArrowRight className="mr-2 h-4 w-4" />
                Record Payment
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            For Invoice {sale.id} - Due {sale.dueDate ? format(new Date(sale.dueDate), 'PP') : 'N/A'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
            <div className="text-4xl font-bold text-center">₱{Number(sale.total).toFixed(2)}</div>
            <div className="text-sm text-muted-foreground text-center">Total Amount Due</div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a payment method" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {isLoadingPaymentMethods ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                            paymentMethods?.map(method => <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>)
                        )}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter payment reference..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="depositAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a deposit account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingDepositAccounts ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        depositAccounts?.map(account => <SelectItem key={account.id} value={account.name}>{account.name}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <AlertDialog open={showPrintConfirm} onOpenChange={setShowPrintConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Payment Successful</AlertDialogTitle>
                <AlertDialogDescription>
                    Would you like to print a receipt for this payment?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={handleClose}>No, Close</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    handlePrintReceipt(form.getValues().paymentDate, form.getValues().amount, form.getValues().paymentMethod, form.getValues().reference);
                    handleClose();
                }}>Yes, Print Receipt</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

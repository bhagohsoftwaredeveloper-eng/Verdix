
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

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
    { id: 'pm_1', name: 'Cash' },
    { id: 'pm_2', name: 'Credit Card' },
    { id: 'pm_3', name: 'Bank Transfer' },
    { id: 'pm_4', name: 'GCash' },
];

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be positive.'),
  paymentMethod: z.string().min(1, 'Payment method is required.'),
  paymentDate: z.date(),
  reference: z.string().optional(),
  depositAccount: z.string().min(1, 'Deposit account is required.'),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export function RecordPaymentDialog({ sale }: { sale: Sale }) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true);
  const [depositAccounts, setDepositAccounts] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingDepositAccounts, setIsLoadingDepositAccounts] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching payment methods
    setIsLoadingPaymentMethods(true);
    setTimeout(() => {
        setPaymentMethods(MOCK_PAYMENT_METHODS);
        setIsLoadingPaymentMethods(false);
    }, 300);

    // Simulate fetching deposit accounts
    setIsLoadingDepositAccounts(true);
    setTimeout(() => {
        setDepositAccounts([
            { id: 'da_1', name: 'Cash Account' },
            { id: 'da_2', name: 'Bank Account - BDO' },
            { id: 'da_3', name: 'Bank Account - BPI' },
            { id: 'da_4', name: 'Petty Cash' },
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
            description: `Payment amount must be exactly ₱${sale.total.toFixed(2)}. Partial payments are not yet supported.`,
        });
        return;
    }

    console.log('Mock payment submitted:', {
      saleId: sale.id,
      ...values,
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    toast({
      title: 'Payment Recorded (Mock)',
      description: `Payment of ₱${values.amount.toFixed(2)} for invoice ${sale.id} has been recorded.`,
    });
    
    setIsOpen(false);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
            <ArrowRight className="mr-2 h-4 w-4" />
            Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            For Invoice {sale.id} - Due {sale.dueDate ? format(new Date(sale.dueDate), 'PP') : 'N/A'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
            <div className="text-4xl font-bold text-center">₱{sale.total.toFixed(2)}</div>
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
    </Dialog>
  );
}

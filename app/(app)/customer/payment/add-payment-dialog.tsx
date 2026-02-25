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
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-config';
import type { Customer } from '@/lib/types';

const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  paymentType: z.string().min(1, 'Payment type is required'),
  paymentDate: z.date({
    required_error: 'Payment date is required',
  }),
  amount: z.coerce.number().positive('Amount must be positive'),
  note: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const PAYMENT_TYPES = [
  'Cash',
  'Bank Transfer',
  'Check',
  'GCash',
  'PayMaya',
  'Credit Card',
  'Debit Card',
  'Other',
];

// Generate auto reference
function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAY-${timestamp}-${random}`;
}

interface AddPaymentDialogProps {
  onSuccess?: () => void;
}

export function AddPaymentDialog({ onSuccess }: AddPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: '',
      paymentType: '',
      paymentDate: new Date(),
      amount: 0,
      note: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch customers when dialog opens
      const fetchCustomers = async () => {
        try {
          setIsLoadingCustomers(true);
          const response = await fetch(getApiUrl('/customers'));
          if (response.ok) {
            const result = await response.json();
            setCustomers(result.data || []);
          }
        } catch (error) {
          console.error('Failed to fetch customers:', error);
        } finally {
          setIsLoadingCustomers(false);
        }
      };
      fetchCustomers();
    }
  }, [isOpen]);

  const { isSubmitting } = form.formState;

  async function onSubmit(values: PaymentFormValues) {
    try {
      const reference = generateReference();

      const response = await fetch(getApiUrl('/customer-payments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: values.customerId,
          paymentType: values.paymentType,
          paymentDate: values.paymentDate.toISOString(),
          amount: values.amount,
          reference,
          note: values.note || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Payment Added',
          description: `Payment of ₱${values.amount.toFixed(2)} recorded with reference ${reference}.`,
        });
        setIsOpen(false);
        form.reset();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add payment.',
        });
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add payment. Please try again.',
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record a new payment from a customer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingCustomers ? "Loading customers..." : "Select a customer"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingCustomers ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.contactNumber})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Payment</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to be Paid</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the payment..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
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
                    Adding Payment...
                  </>
                ) : (
                  'Add Payment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

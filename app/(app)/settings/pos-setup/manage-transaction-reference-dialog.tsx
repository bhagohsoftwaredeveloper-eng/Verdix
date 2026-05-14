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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';

const transactionReferenceSchema = z.object({
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

type TransactionReferenceFormValues = z.infer<typeof transactionReferenceSchema>;

interface LastReferences {
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

interface ManageTransactionReferenceDialogProps {
  onUpdated?: () => void;
}

export function ManageTransactionReferenceDialog({ onUpdated }: ManageTransactionReferenceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastReferences, setLastReferences] = useState<LastReferences | null>(null);
  const { toast } = useToast();

  const form = useForm<TransactionReferenceFormValues>({
    resolver: zodResolver(transactionReferenceSchema),
    defaultValues: {
      salesOrder: '',
      purchaseOrder: '',
      salesDelivery: '',
      paymentToSupplier: '',
      salesInvoice: '',
      customerPayment: '',
      deliveryReceipt: '',
      stockAdjustment: '',
      salesHold: '',
      receiptNumber: '',
    },
  });

  // Helper to calculate next reference from last reference
  const calculateNextReference = (lastRef: string | null | undefined): string => {
    if (!lastRef) return '';
    
    // Match any trailing number
    const match = lastRef.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numberStr = match[2];
      const numberLength = numberStr.length;
      const nextNumber = parseInt(numberStr) + 1;
      // Pad with zeros to maintain length if it was zero-padded
      const paddedNumber = nextNumber.toString().padStart(numberLength, '0');
      return `${prefix}${paddedNumber}`;
    }
    
    return '';
  };

  // Fetch current values and last references when dialog opens
  const fetchReferences = async () => {
    try {
      setIsLoading(true);
      
      const [nextRefResponse, lastRefResponse] = await Promise.all([
        fetch(getApiUrl('/transaction-references')),
        fetch(getApiUrl('/transactions/last-references'))
      ]);

      const nextRefResult = await nextRefResponse.json();
      const lastRefResult = await lastRefResponse.json();

      let newValues = { ...form.getValues() };
      let lastRefs: LastReferences | null = null;

      if (lastRefResult.success && lastRefResult.data) {
        setLastReferences(lastRefResult.data);
        lastRefs = lastRefResult.data;
      }

      // If next reference data exists, use it
      if (nextRefResult.success && nextRefResult.data) {
        newValues = { ...newValues, ...nextRefResult.data };
      }

      // For any field that is still empty/missing, try to calculate from last reference
      if (lastRefs) {
        (Object.keys(transactionReferenceSchema.shape) as Array<keyof TransactionReferenceFormValues>).forEach((key) => {
          // Only calculate if the current "next" value is falsy (empty or null)
          // AND we have a last reference for this key
          if (!newValues[key] && lastRefs![key]) {
             newValues[key] = calculateNextReference(lastRefs![key]);
          }
        });
      }

      form.reset(newValues);

    } catch (error) {
      console.error('Error fetching references:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchReferences();
    }
  };

  async function onSubmit(values: TransactionReferenceFormValues) {
    setIsSaving(true);
    try {
      const response = await fetch(getApiUrl('/transaction-references'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'References Updated',
          description: 'Transaction references have been updated successfully',
        });
        setOpen(false);
        onUpdated?.();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update references.',
        });
      }
    } catch (error) {
      console.error('Error updating references:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update transaction references. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary/80">
          <span className="text-xs font-medium">Manage</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Next Reference Numbers</DialogTitle>
          <DialogDescription className="sr-only">Set the next reference numbers for each transaction type</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="py-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <FormField
                    control={form.control}
                    name="salesOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Order</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next reference number" />
                        </FormControl>
                        {lastReferences?.salesOrder && (
                          <FormDescription className="text-xs">
                            Last used: <span className="font-mono font-medium">{lastReferences.salesOrder}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchaseOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Order</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next reference number" />
                        </FormControl>
                        {lastReferences?.purchaseOrder && (
                          <FormDescription className="text-xs">
                            Last used: <span className="font-mono font-medium">{lastReferences.purchaseOrder}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salesDelivery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Delivery</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next reference number" />
                        </FormControl>
                        {lastReferences?.salesDelivery && (
                          <FormDescription className="text-xs">
                            Last used: <span className="font-mono font-medium">{lastReferences.salesDelivery}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentToSupplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment To Supplier</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next reference number" />
                        </FormControl>
                        {lastReferences?.paymentToSupplier && (
                          <FormDescription className="text-xs">
                            Last used: <span className="font-mono font-medium">{lastReferences.paymentToSupplier}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salesInvoice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Invoice</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next reference number" />
                        </FormControl>
                        {lastReferences?.salesInvoice && (
                          <FormDescription className="text-xs">
                            Last used: <span className="font-mono font-medium">{lastReferences.salesInvoice}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerPayment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Payment</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next reference number" />
                        </FormControl>
                        {lastReferences?.customerPayment && (
                          <FormDescription className="text-xs">
                            Last used: <span className="font-mono font-medium">{lastReferences.customerPayment}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryReceipt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Receipt</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next reference number" />
                        </FormControl>
                        {lastReferences?.deliveryReceipt && (
                          <FormDescription className="text-xs">
                            Last used: <span className="font-mono font-medium">{lastReferences.deliveryReceipt}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stockAdjustment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Adjustment</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next reference number" />
                        </FormControl>
                        {lastReferences?.stockAdjustment && (
                          <FormDescription className="text-xs">
                            Last used: <span className="font-mono font-medium">{lastReferences.stockAdjustment}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salesHold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Hold</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next reference number" />
                        </FormControl>
                        {lastReferences?.salesHold && (
                          <FormDescription className="text-xs">
                            Last used: <span className="font-mono font-medium">{lastReferences.salesHold}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receiptNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Receipt Number (Global)</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder="Next receipt number" />
                        </FormControl>
                        {lastReferences?.receiptNumber && (
                          <FormDescription className="text-xs">
                            Current counter: <span className="font-mono font-medium">{lastReferences.receiptNumber}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

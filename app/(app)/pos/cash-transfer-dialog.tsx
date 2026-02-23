
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
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Minus, Plus } from 'lucide-react';
import { AdminAuthDialog } from './admin-auth-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';

const transferSchema = z.object({
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  reason: z.string().min(3, 'A reason is required (min. 3 characters).'),
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface CashTransferDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  shiftId: string | null;
  terminalId: string;
  userId: string;
}

export function CashTransferDialog({ isOpen, onOpenChange, shiftId, terminalId, userId }: CashTransferDialogProps) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [transferType, setTransferType] = useState<'pickup' | 'deposit'>('pickup');
  const { toast } = useToast();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: 0,
      reason: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
      setTransferType('pickup');
    }
  }, [isOpen, form]);

  const { isSubmitting } = form.formState;

  const handleAdminAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    form.handleSubmit(onSubmit)();
  };

  async function onSubmit(values: TransferFormValues) {
    try {
        const response = await fetch(getApiUrl('/pos/cash-transfer'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shiftId,
                terminalId,
                userId,
                amount: values.amount,
                type: transferType,
                reason: values.reason
            })
        });

        const result = await response.json();

        if (result.success) {
            toast({
                title: "Transfer Recorded",
                description: `Successfully recorded cash ${transferType}.`,
            });
            onOpenChange(false);
        } else {
             toast({
                title: "Transfer Failed",
                description: result.error || "Failed to record transfer.",
                variant: 'destructive'
            });
        }

    } catch (error) {
        console.error("Transfer error:", error);
         toast({
            title: "Transfer Failed",
            description: "An unexpected error occurred.",
            variant: 'destructive'
        });
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Cash Transfer</DialogTitle>
            <DialogDescription>
              Record a cash deposit into or pickup from the drawer. Admin authentication is required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-4">
              <Button variant={transferType === 'deposit' ? 'default' : 'outline'} onClick={() => setTransferType('deposit')}>
                  <Plus className="mr-2 h-4 w-4"/>
                  Cash Deposit
              </Button>
              <Button variant={transferType === 'pickup' ? 'destructive' : 'outline'} onClick={() => setTransferType('pickup')}>
                  <Minus className="mr-2 h-4 w-4"/>
                  Cash Pickup
              </Button>
          </div>
          <Form {...form}>
            <form 
                id="cash-transfer-form" 
                onSubmit={(e) => {
                    e.preventDefault();
                    setIsAuthDialogOpen(true);
                }} 
                className={cn("space-y-4 rounded-lg border p-4",
                    transferType === 'deposit' ? 'border-primary/50' : 'border-destructive/50'
                )}
            >
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₱)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason / Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Change for customer, end of day deposit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
           <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button type="submit" form="cash-transfer-form" disabled={isSubmitting} variant={transferType === 'deposit' ? 'default' : 'destructive'}>
                    {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                    </>
                    ) : (
                    'Confirm Transfer'
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminAuthDialog
        isOpen={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        onSuccess={handleAdminAuthSuccess}
      />
    </>
  );
}

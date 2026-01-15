'use client';

import { useState } from 'react';
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

const transactionReferenceSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required').max(10, 'Prefix must be 10 characters or less'),
});

type TransactionReferenceFormValues = z.infer<typeof transactionReferenceSchema>;

interface ManageTransactionReferenceDialogProps {
  currentPrefix: string;
  onPrefixUpdated: (prefix: string) => void;
}

export function ManageTransactionReferenceDialog({ currentPrefix, onPrefixUpdated }: ManageTransactionReferenceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<TransactionReferenceFormValues>({
    resolver: zodResolver(transactionReferenceSchema),
    defaultValues: {
      prefix: currentPrefix,
    },
  });

  async function onSubmit(values: TransactionReferenceFormValues) {
    setIsSaving(true);
    try {
      onPrefixUpdated(values.prefix);
      toast({
        title: 'Transaction Prefix Updated',
        description: `Transaction prefix has been set to "${values.prefix}"`,
      });
      setOpen(false);
    } catch (error) {
      console.error('Error updating transaction prefix:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update transaction prefix. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary/80">
          <span className="text-xs font-medium">Manage</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transaction Reference Format</DialogTitle>
          <DialogDescription>
            Configure the prefix for transaction numbers
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Prefix</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., TXN, INV, SO" {...field} />
                  </FormControl>
                  <FormDescription>
                    Preview: {field.value || 'TXN'}-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}-0001
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
      </DialogContent>
    </Dialog>
  );
}

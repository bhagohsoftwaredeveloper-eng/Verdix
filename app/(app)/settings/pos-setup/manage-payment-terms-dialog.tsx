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
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const paymentTermSchema = z.object({
  name: z.string().min(1, 'Payment term name is required'),
  days: z.coerce.number().min(0, 'Days must be 0 or greater').default(0),
});

type PaymentTermFormValues = z.infer<typeof paymentTermSchema>;

export function ManagePaymentTermsDialog() {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [termToDelete, setTermToDelete] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<PaymentTermFormValues>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      name: '',
      days: 0,
    },
  });

  const fetchPaymentTerms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/payment-terms');
      const result = await response.json();
      if (result.success) {
        setPaymentTerms(result.data);
      }
    } catch (error) {
      console.error('Error fetching payment terms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPaymentTerms();
    }
  }, [open]);

  async function onSubmit(values: PaymentTermFormValues) {
    setIsSaving(true);
    try {
      const response = await fetch('/api/payment-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Payment Term Added',
          description: `Payment term "${values.name}" has been successfully added.`,
        });
        form.reset();
        fetchPaymentTerms();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add payment term.',
        });
      }
    } catch (error) {
      console.error('Error adding payment term:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add payment term. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!termToDelete) return;

    try {
      const response = await fetch(`/api/payment-terms?id=${termToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Payment Term Deleted',
          description: `Payment term "${termToDelete.name}" has been successfully deleted.`,
        });
        fetchPaymentTerms();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete payment term.',
        });
      }
    } catch (error) {
      console.error('Error deleting payment term:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete payment term. Please try again.',
      });
    } finally {
      setTermToDelete(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary/80">
            <span className="text-xs font-medium">Manage</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] h-[500px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Payment Terms</DialogTitle>
            <DialogDescription>
              Add new payment terms or manage existing ones
            </DialogDescription>
          </DialogHeader>

          {/* Add Payment Term Form */}
          <div className="py-4 border-b">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Payment Term</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Net 30, COD" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel>Days</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span className="ml-2">Add</span>
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Payment Terms List */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Term</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : paymentTerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No payment terms found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentTerms.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-medium">{term.name}</TableCell>
                      <TableCell>{term.days}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => setTermToDelete({ id: term.id, name: term.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!termToDelete} onOpenChange={(open) => !open && setTermToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the payment term "{termToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.stopPropagation(); confirmDelete(); }} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

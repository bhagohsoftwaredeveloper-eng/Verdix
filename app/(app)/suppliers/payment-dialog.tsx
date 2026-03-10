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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PhilippinePeso, Calculator, CheckCircle2, Circle, Search } from 'lucide-react';
import { addSupplierPayment, SupplierWithBalance, getUnpaidPurchaseOrders } from './actions';
import { usePaymentMethods } from '@/hooks/use-api';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { printSupplierVoucher } from '@/lib/print-supplier-voucher';
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

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export function MakePaymentDialog({ 
  supplier, 
  onPaymentComplete,
  trigger 
}: { 
  supplier: SupplierWithBalance; 
  onPaymentComplete?: () => void;
  trigger?: React.ReactNode; 
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { paymentMethods } = usePaymentMethods();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      reference: '',
      notes: '',
    },
  });

  const [unpaidPOs, setUnpaidPOs] = useState<any[]>([]);
  const [selectedPOs, setSelectedPOs] = useState<Record<string, number>>({});
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [showPrintResult, setShowPrintResult] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);
  const [poSearchTerm, setPoSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      fetchPOs();
    }
  }, [open, supplier.id]);

  const fetchPOs = async () => {
    setLoadingPOs(true);
    try {
      const pos = await getUnpaidPurchaseOrders(supplier.id);
      setUnpaidPOs(pos);
    } catch (error) {
      console.error('Failed to fetch POs:', error);
    } finally {
      setLoadingPOs(false);
    }
  };

  const handleAutoAllocate = () => {
    const totalAmount = form.getValues('amount');
    let remaining = totalAmount;
    const newSelected: Record<string, number> = {};

    for (const po of unpaidPOs) {
      if (remaining <= 0) break;
      const allocAmount = Math.min(remaining, po.balance);
      newSelected[po.id] = allocAmount;
      remaining -= allocAmount;
    }

    setSelectedPOs(newSelected);
  };

  const handlePOToggle = (poId: string, balance: number) => {
    setSelectedPOs(prev => {
      const next = { ...prev };
      if (next[poId]) {
        delete next[poId];
      } else {
        next[poId] = balance;
      }
      return next;
    });
  };

  const handlePOAmountChange = (poId: string, amount: number, balance: number) => {
    setSelectedPOs(prev => ({
      ...prev,
      [poId]: Math.min(amount, balance)
    }));
  };

  const filteredPOs = unpaidPOs.filter(po => 
    (po.referenceNumber?.toLowerCase() || '').includes(poSearchTerm.toLowerCase()) ||
    (po.id?.toLowerCase() || '').includes(poSearchTerm.toLowerCase())
  );

  const totalAllocated = Object.values(selectedPOs).reduce((sum, val) => sum + val, 0);

  async function onSubmit(values: PaymentFormValues) {
    if (totalAllocated > values.amount) {
       toast({
         variant: 'destructive',
         title: 'Allocation Error',
         description: 'Allocated amount exceeds total payment amount.',
       });
       return;
    }

    setIsSubmitting(true);
    try {
      const result = await addSupplierPayment({
        supplierId: supplier.id,
        amount: values.amount,
        date: values.date,
        paymentMethod: values.paymentMethod,
        reference: values.reference,
        notes: values.notes,
        allocations: Object.entries(selectedPOs).map(([id, amount]) => ({
          purchaseOrderId: id,
          amount
        }))
      });

      if (result.success) {
        setLastPayment({
          id: `sp_${Date.now()}`, // Temporary or get from result
          supplierName: supplier.name,
          date: values.date,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          reference: values.reference,
          notes: values.notes,
          allocations: Object.entries(selectedPOs).map(([id, amount]) => ({
            purchaseOrderId: id,
            amount,
            referenceNumber: unpaidPOs.find(p => p.id === id)?.referenceNumber
          }))
        });

        toast({
          title: 'Payment Recorded',
          description: `Payment of ₱${values.amount.toFixed(2)} recorded for ${supplier.name}.`,
        });
        setOpen(false);
        form.reset();
        setSelectedPOs({});
        setShowPrintResult(true);
        if (onPaymentComplete) {
          onPaymentComplete();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to record payment. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm"><PhilippinePeso className="mr-2 h-4 w-4"/> Pay</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment to {supplier.name}. Current Balance: ₱{supplier.balance.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods?.map(method => (
                        <SelectItem key={method.id} value={method.name}>
                          {method.name}
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
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Check no., Transaction ID, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Additional remarks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2 border rounded-md p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">PO Allocations</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleAutoAllocate}
                  disabled={form.getValues('amount') <= 0 || loadingPOs}
                >
                  <Calculator className="h-3 w-3 mr-1" />
                  Auto-Allocate
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search PO reference..."
                  className="pl-7 h-8 text-xs"
                  value={poSearchTerm}
                  onChange={(e) => setPoSearchTerm(e.target.value)}
                />
              </div>

              <ScrollArea className="h-[200px] pr-4">
                {loadingPOs ? (
                   <div className="text-center py-4 text-xs text-muted-foreground">Loading POs...</div>
                ) : filteredPOs.length === 0 ? (
                   <div className="text-center py-4 text-xs text-muted-foreground">
                    {poSearchTerm ? 'No matching POs found.' : 'No unpaid POs found.'}
                   </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPOs.map(po => (
                      <div key={po.id} className="flex flex-col gap-1 border-b pb-2 last:border-0">
                         <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                               <Checkbox 
                                 id={`po-${po.id}`} 
                                 checked={!!selectedPOs[po.id]}
                                 onCheckedChange={() => handlePOToggle(po.id, po.balance)}
                               />
                               <label htmlFor={`po-${po.id}`} className="text-xs font-medium cursor-pointer truncate">
                                  {po.referenceNumber || po.id}
                               </label>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                               {format(new Date(po.date), 'MM/dd/yy')}
                            </span>
                         </div>
                         <div className="flex items-center justify-between pl-6">
                            <span className="text-[10px] text-muted-foreground">
                               Bal: ₱{po.balance.toLocaleString()}
                            </span>
                            {selectedPOs[po.id] !== undefined && (
                               <div className="flex items-center gap-1">
                                  <span className="text-[10px]">Pay:</span>
                                  <Input 
                                    type="number" 
                                    className="h-6 w-20 text-[10px] p-1"
                                    value={selectedPOs[po.id]}
                                    onChange={(e) => handlePOAmountChange(po.id, parseFloat(e.target.value) || 0, po.balance)}
                                  />
                               </div>
                            )}
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              <div className="flex justify-between items-center text-[11px] font-semibold pt-2 border-t mt-2">
                 <span>Allocated: ₱{totalAllocated.toLocaleString()}</span>
                 <span className={totalAllocated > form.getValues('amount') ? 'text-red-500' : 'text-emerald-600'}>
                    Rem: ₱{(form.getValues('amount') - totalAllocated).toLocaleString()}
                 </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <AlertDialog open={showPrintResult} onOpenChange={setShowPrintResult}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Payment Recorded Successfully</AlertDialogTitle>
            <AlertDialogDescription>
               Would you like to print the payment voucher for this transaction?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Done</AlertDialogCancel>
            <AlertDialogAction onClick={() => lastPayment && printSupplierVoucher(lastPayment)}>
              Print Voucher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

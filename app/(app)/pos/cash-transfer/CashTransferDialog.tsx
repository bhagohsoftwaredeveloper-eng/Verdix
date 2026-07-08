'use client';

import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Minus, Plus, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCashTransfer } from './use-cash-transfer';
import type { CashTransferDialogProps } from './cash-transfer-types';

export function CashTransferDialog({ isOpen, onOpenChange, shiftId, terminalId, userId }: CashTransferDialogProps) {
  const {
    form, isSubmitting, transferType, setTransferType, onSubmit,
  } = useCashTransfer({ isOpen, shiftId, terminalId, userId, onOpenChange });

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-[480px] w-full p-0 flex flex-col gap-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b space-y-0 text-left">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2.5 rounded-2xl transition-colors shrink-0',
                transferType === 'deposit'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'
              )}>
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-xl font-extrabold">Cash Transfer</SheetTitle>
                <SheetDescription className="text-sm">
                  Record a drawer deposit or pickup.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
              <button
                type="button"
                onClick={() => setTransferType('deposit')}
                className={cn(
                  'flex items-center justify-center gap-2 h-12 rounded-lg font-bold text-sm transition-all',
                  transferType === 'deposit' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-muted-foreground hover:bg-background'
                )}
              >
                <Plus className="h-4 w-4" /> Cash Deposit
              </button>
              <button
                type="button"
                onClick={() => setTransferType('pickup')}
                className={cn(
                  'flex items-center justify-center gap-2 h-12 rounded-lg font-bold text-sm transition-all',
                  transferType === 'pickup' ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'text-muted-foreground hover:bg-background'
                )}
              >
                <Minus className="h-4 w-4" /> Cash Pickup
              </button>
            </div>

            <Form {...form}>
              <form
                id="cash-transfer-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground pointer-events-none">₱</span>
                          <Input type="number" step="0.01" placeholder="0.00" className="h-16 pl-11 text-3xl font-black tracking-tight" {...field} value={field.value || ''} />
                        </div>
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
                      <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reason / Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Change for customer, end of day deposit" className="h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <SheetFooter className="px-6 py-4 border-t flex-row gap-3 sm:justify-end">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none h-12" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="cash-transfer-form"
              disabled={isSubmitting}
              className={cn(
                'flex-1 sm:flex-none h-12 font-bold text-white',
                transferType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming...</>
              ) : `Confirm ${transferType === 'deposit' ? 'Deposit' : 'Pickup'}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </>
  );
}

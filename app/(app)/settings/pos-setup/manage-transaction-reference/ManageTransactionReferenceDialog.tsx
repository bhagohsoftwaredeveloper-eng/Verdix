'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useManageTransactionReference } from './use-manage-transaction-reference';
import { REFERENCE_FIELDS } from './manage-transaction-reference-types';

interface Props { onUpdated?: () => void; }

export function ManageTransactionReferenceDialog({ onUpdated }: Props) {
  const [open, setOpen] = useState(false);

  const { form, isSaving, isLoading, lastReferences, onSubmit } = useManageTransactionReference(open, onUpdated);

  const handleSubmit = form.handleSubmit(async (values) => {
    const ok = await onSubmit(values);
    if (ok) setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  {REFERENCE_FIELDS.map(({ name, label, placeholder, lastLabel }) => (
                    <FormField key={name} control={form.control} name={name} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10" placeholder={placeholder ?? 'Next reference number'} />
                        </FormControl>
                        {lastReferences?.[name] && (
                          <FormDescription className="text-xs">
                            {lastLabel ?? 'Last used:'}{' '}
                            <span className="font-mono font-medium">{lastReferences[name]}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
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

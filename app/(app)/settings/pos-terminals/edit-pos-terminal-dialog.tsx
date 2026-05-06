'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';

const terminalSchema = z.object({
  ipAddress: z.string().optional(),
  terminalDescription: z.string().optional(),
  serialNumber: z.string().optional(),
  min: z.string().optional(),
  permitNo: z.string().optional(),
  printOfficialReceipt: z.string().optional(),
  orNextReference: z.string().optional(),
  inventoryLocation: z.string().optional(),
});

type TerminalFormValues = z.infer<typeof terminalSchema>;

interface PosTerminal {
  id: string;
  ipAddress: string | null;
  terminalDescription: string | null;
  serialNumber: string | null;
  min: string | null;
  permitNo: string | null;
  printOfficialReceipt: string | null;
  orNextReference: string | null;
  inventoryLocation: string | null;
}

interface EditPosTerminalDialogProps {
  terminal: PosTerminal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTerminalUpdated: () => void;
}

export function EditPosTerminalDialog({
  terminal,
  open,
  onOpenChange,
  onTerminalUpdated,
}: EditPosTerminalDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  const form = useForm<TerminalFormValues>({
    resolver: zodResolver(terminalSchema),
    defaultValues: {
      ipAddress: terminal.ipAddress || '',
      terminalDescription: terminal.terminalDescription || '',
      serialNumber: terminal.serialNumber || '',
      min: terminal.min || '',
      permitNo: terminal.permitNo || '',
      printOfficialReceipt: terminal.printOfficialReceipt || 'No',
      orNextReference: terminal.orNextReference || '',
      inventoryLocation: terminal.inventoryLocation || 'Store',
    },
  });

  // Reset form when terminal changes
  useEffect(() => {
    form.reset({
      ipAddress: terminal.ipAddress || '',
      terminalDescription: terminal.terminalDescription || '',
      serialNumber: terminal.serialNumber || '',
      min: terminal.min || '',
      permitNo: terminal.permitNo || '',
      printOfficialReceipt: terminal.printOfficialReceipt || 'No',
      orNextReference: terminal.orNextReference || '',
      inventoryLocation: terminal.inventoryLocation || 'Store',
    });
  }, [terminal, form]);

  useEffect(() => {
    if (open) {
      fetchWarehouses();
    }
  }, [open]);

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(getApiUrl('/warehouses?activeOnly=true'));
      const result = await response.json();
      if (result.success) {
        setWarehouses(result.data);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  async function onSubmit(values: TerminalFormValues) {
    setIsSaving(true);
    try {
      const response = await fetch(getApiUrl('/pos-terminals'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: terminal.id, ...values }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Terminal Updated',
          description: `Terminal has been successfully updated.`,
        });
        onOpenChange(false);
        onTerminalUpdated();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update terminal.',
        });
      }
    } catch (error) {
      console.error('Error updating terminal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update terminal. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Pos Terminal</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP ADDRESS</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="terminalDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terminal Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MIN</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permitNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PERMIT NO.</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="printOfficialReceipt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Print Official Receipt</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orNextReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OR Next reference</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="inventoryLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventory Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.length === 0 ? (
                            <SelectItem value="Store">Store</SelectItem>
                        ) : (
                            warehouses.map((w) => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
      </DialogContent>
    </Dialog>
  );
}

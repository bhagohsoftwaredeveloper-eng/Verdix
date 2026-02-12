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
import { CalendarIcon, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CustomerWithLoyalty {
  id: string;
  customer_id: string;
  name: string;
  contact_number: string;
  payment_terms: string | null;
  rfid_code: string | null;
  expiry_date: string | null;
  point_setting: string | null;
  loyaltyPoints: number;
  last_transaction: string | null;
  created_at: string;
  updated_at: string;
}

const editLoyaltyCardSchema = z.object({
  rfidCode: z.string().min(1, 'RFID Card Code is required'),
  expiryDate: z.date({
    required_error: 'Expiry date is required',
  }),
  pointSetting: z.string().min(1, 'Point setting is required'),
});

type EditLoyaltyCardFormValues = z.infer<typeof editLoyaltyCardSchema>;

interface LoyaltySetting {
  id: string;
  description: string;
  base: string;
  amount: number;
  equivalent: number;
}

export function EditLoyaltyCardDialog({ customer, onSuccess }: { customer: CustomerWithLoyalty, onSuccess?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySetting[]>([]);
  const { toast } = useToast();

  const form = useForm<EditLoyaltyCardFormValues>({
    resolver: zodResolver(editLoyaltyCardSchema),
    defaultValues: {
      rfidCode: customer.rfid_code || '',
      expiryDate: customer.expiry_date ? new Date(customer.expiry_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      pointSetting: customer.point_setting || '',
    },
  });

  // Update form when customer changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      // Fetch loyalty settings
      const fetchSettings = async () => {
        try {
          const response = await fetch('/api/loyalty-settings');
          if (response.ok) {
            const result = await response.json();
            setLoyaltySettings(result.data || []);
          }
        } catch (error) {
          console.error('Failed to fetch loyalty settings:', error);
        }
      };
      
      fetchSettings();

      form.reset({
        rfidCode: customer.rfid_code || '',
        expiryDate: customer.expiry_date ? new Date(customer.expiry_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        pointSetting: customer.point_setting || '',
      });
    }
  }, [isOpen, customer, form]);

  async function onSubmit(values: EditLoyaltyCardFormValues) {
    try {
      const response = await fetch(`/api/customer-loyalty/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rfidCode: values.rfidCode,
          expiryDate: values.expiryDate ? values.expiryDate.toISOString().split('T')[0] : null,
          pointSetting: values.pointSetting,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Loyalty Card Updated',
          description: `RFID card ${values.rfidCode} has been updated for ${customer.name}.`,
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
          description: result.error || 'Failed to update loyalty card.',
        });
      }
    } catch (error) {
      console.error('Error updating loyalty card:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update loyalty card. Please try again.',
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Edit Loyalty Card">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Loyalty Card</DialogTitle>
          <DialogDescription>
            Update the loyalty card information for {customer.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rfidCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RFID Card Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., RFID-123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiry Date</FormLabel>
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
                          date < new Date() || date < new Date('1900-01-01')
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
              name="pointSetting"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Point Setting</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Point Setting" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loyaltySettings.length > 0 ? (
                        loyaltySettings.map((setting) => (
                          <SelectItem key={setting.id} value={setting.description}>
                            {setting.description} ({setting.amount} pts / {setting.equivalent})
                          </SelectItem>
                        ))
                      ) : (
                         <SelectItem value="none" disabled>No settings available</SelectItem>
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
              <Button type="submit">
                Update Loyalty Card
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

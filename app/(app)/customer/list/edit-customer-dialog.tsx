'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, PlusCircle } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/client-activity-logger';
import { getApiUrl } from '@/lib/api-config';
import { Customer } from '@/lib/types';

interface LoyaltySetting {
  id: string;
  description: string;
  base: string;
  amount: number;
  equivalent: number;
}

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  active: z.boolean().default(true),
  loyaltyPoints: z.coerce.number().min(0).default(0),
  paymentTerms: z.string().optional(),
  address: z.string().optional(),
  billingAddress: z.string().optional(),
  discount: z.coerce.number().min(0).max(100, 'Discount must be between 0 and 100'),
  creditLimit: z.coerce.number().min(0, 'Credit limit must be non-negative'),
  priceLevelId: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

interface EditCustomerDialogProps {
  customer: Customer;
  onSave: (values: CustomerFormValues) => Promise<void>;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

import { AddSalesAreaDialog } from './add-sales-area-dialog';
import { AddSalesGroupDialog } from './add-sales-group-dialog';
import { ManagePaymentTermsDialog } from '../../settings/pos-setup/manage-payment-terms/ManagePaymentTermsDialog';

export default function EditCustomerDialog({ customer, onSave, children, open: controlledOpen, onOpenChange: setControlledOpen }: EditCustomerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen || (() => {}) : setInternalOpen;

  const [isSaving, setIsSaving] = useState(false);
  const [priceLevels, setPriceLevels] = useState<any[]>([]);
  const [isLoadingPriceLevels, setIsLoadingPriceLevels] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySetting[]>([]);
  const [isLoadingLoyaltySettings, setIsLoadingLoyaltySettings] = useState(false);
  const [paymentTermsList, setPaymentTermsList] = useState<any[]>([]);
  const [isLoadingPaymentTerms, setIsLoadingPaymentTerms] = useState(false);
  const [isManagePaymentTermsOpen, setIsManagePaymentTermsOpen] = useState(false);
  const [isPaymentTermsSelectOpen, setIsPaymentTermsSelectOpen] = useState(false);
  const [sameAsAddress, setSameAsAddress] = useState(false);
  const { toast } = useToast();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer.name,
      contactNumber: customer.contactNumber,
      active: customer.active === undefined ? true : !!customer.active,
      loyaltyPoints: customer.loyaltyPoints || 0,
      paymentTerms: customer.paymentTerms || '',
      address: customer.address || '',
      billingAddress: customer.billingAddress || '',
      discount: customer.discount || 0,
      creditLimit: customer.creditLimit || 0,
      priceLevelId: customer.priceLevelId || '',
    },
  });

  useEffect(() => {
    if (isOpen && customer) {
      form.reset({
        name: customer.name,
        contactNumber: customer.contactNumber,
        active: customer.active === undefined ? true : !!customer.active,
        loyaltyPoints: customer.loyaltyPoints || 0,
        paymentTerms: customer.paymentTerms || '',
        address: customer.address || '',
        billingAddress: customer.billingAddress || '',
        discount: customer.discount || 0,
        creditLimit: customer.creditLimit || 0,
        priceLevelId: customer.priceLevelId || '',
      });
      setSameAsAddress(false);
      fetchPriceLevels();
      fetchLoyaltySettings();
      fetchPaymentTerms();
    }
  }, [isOpen, customer, form]);

  const fetchPriceLevels = async () => {
    try {
      setIsLoadingPriceLevels(true);
      const levels = await import('../../products/actions').then(m => m.getPriceLevels());
      setPriceLevels(levels);
    } catch (error) {
      console.error('Error fetching price levels:', error);
    } finally {
      setIsLoadingPriceLevels(false);
    }
  };

  const fetchLoyaltySettings = async () => {
    try {
      setIsLoadingLoyaltySettings(true);
      const response = await fetch(getApiUrl('/loyalty-settings'));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();

      if (result.success) {
        setLoyaltySettings(result.data);
      } else {
         console.error('Failed to fetch loyalty settings:', result.error);
      }
    } catch (error) {
      console.error('Error fetching loyalty settings:', error);
    } finally {
      setIsLoadingLoyaltySettings(false);
    }
  };

  const fetchPaymentTerms = async () => {
    try {
      setIsLoadingPaymentTerms(true);
      const response = await fetch(getApiUrl('/payment-terms'));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setPaymentTermsList(result.data);
      }
    } catch (error) {
      console.error('Error fetching payment terms:', error);
    } finally {
      setIsLoadingPaymentTerms(false);
    }
  };

  async function onSubmit(values: CustomerFormValues) {
    setIsSaving(true);
    try {
      await onSave(values);
      await logActivity({
        action: 'UPDATE',
        module: 'CUSTOMERS',
        description: `Updated customer: "${values.name}"`,
        referenceId: customer?.id,
      });
      toast({
        title: 'Customer Updated',
        description: `Customer "${values.name}" has been successfully updated.`,
      });
      setIsOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to update customer', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update customer. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update the customer details below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 py-1">
          <Form {...form}>
            <form id="edit-customer-form" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="h-[520px]">
                <Tabs defaultValue="basic" className="w-full h-full">
              <TabsList className="grid w-fit grid-cols-3 mx-auto">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 p-6 h-[450px] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Customer ID</Label>
                  <Input value={customer.id} readOnly placeholder="Customer ID" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="e.g., 09171234567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Enable or disable the customer account
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="address" className="space-y-4 p-6 h-[450px] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 123 Main St, City, Country"
                            {...field}
                            rows={2}
                            onChange={(e) => {
                              field.onChange(e);
                              if (sameAsAddress) {
                                form.setValue('billingAddress', e.target.value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-row items-center justify-between">
                          <FormLabel>Billing Address</FormLabel>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Same as Address</span>
                            <Switch
                              checked={sameAsAddress}
                              onCheckedChange={(checked) => {
                                setSameAsAddress(checked);
                                if (checked) {
                                  form.setValue('billingAddress', form.getValues('address'));
                                }
                              }}
                            />
                          </div>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 123 Main St, City, Country"
                            {...field}
                            rows={2}
                            disabled={sameAsAddress}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              <TabsContent value="financial" className="space-y-4 p-6 h-[450px] overflow-y-auto">
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <Select
                        open={isPaymentTermsSelectOpen}
                        onOpenChange={setIsPaymentTermsSelectOpen}
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Payment Terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingPaymentTerms ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            paymentTermsList?.map(term => (
                              <SelectItem key={term.id} value={term.description}>
                                {term.description}
                              </SelectItem>
                            ))
                          )}
                          <div className="border-t mt-1 pt-1">
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-start h-8 px-2 text-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                   setIsPaymentTermsSelectOpen(false);
                                   setIsManagePaymentTermsOpen(true);
                                }}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Payment Terms
                              </Button>
                          </div>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount (%)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" placeholder="e.g., 10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="creditLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Limit</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="e.g., 50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="loyaltyPoints"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center h-8">
                          <FormLabel>Loyalty Points Setting</FormLabel>
                        </div>
                        <Select 
                          key={field.value?.toString()}
                          onValueChange={(value) => field.onChange(Number(value))} 
                          value={String(field.value ?? 0)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Loyalty Points Setting" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingLoyaltySettings ? (
                               <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : loyaltySettings.length > 0 ? (
                                loyaltySettings.map((setting) => (
                                  <SelectItem key={setting.id} value={Number(setting.amount).toString()}>
                                    {setting.description} ({setting.amount} points)
                                  </SelectItem>
                                ))
                            ) : (
                                <>
                                  <SelectItem value="0">None (0 points)</SelectItem>
                                </>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priceLevelId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center h-8">
                          <FormLabel>Default Price Level</FormLabel>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Price Level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingPriceLevels ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : (
                              priceLevels?.map(level => (
                                <SelectItem key={level.id} value={level.id}>
                                  {level.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
                </Tabs>
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-customer-form" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Customer...
              </>
            ) : (
              'Update Customer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ManagePaymentTermsDialog 
      open={isManagePaymentTermsOpen}
      onOpenChange={setIsManagePaymentTermsOpen}
      onPaymentTermsUpdated={fetchPaymentTerms}
      trigger={null}
    />
    </>
  );
}

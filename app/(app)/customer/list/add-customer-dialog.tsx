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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Loader2, Wand2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/client-activity-logger';
import { getApiUrl } from '@/lib/api-config';
import { ManagePaymentTermsDialog } from '../../settings/pos-setup/manage-payment-terms-dialog';

interface LoyaltySetting {
  id: string;
  description: string;
  base: string;
  amount: number;
  equivalent: number;
}

const customerSchema = z.object({
  customerId: z.string(),
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

type CustomerFormValues = z.infer<typeof customerSchema>;

interface AddCustomerDialogProps {
  onSave: (customerId: string, name: string, contactNumber: string, active: boolean, loyaltyPoints: number, paymentTerms: string, address: string, billingAddress: string, discount: number, creditLimit: number, priceLevelId?: string) => Promise<void>;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  customer?: any; // For editing
}

export default function AddCustomerDialog({ onSave, children, open, onOpenChange, customer }: AddCustomerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;
  const [isSaving, setIsSaving] = useState(false);
  const [priceLevels, setPriceLevels] = useState<any[]>([]);
  const [isLoadingPriceLevels, setIsLoadingPriceLevels] = useState(false);
  const { toast } = useToast();
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySetting[]>([]);
  const [isLoadingLoyaltySettings, setIsLoadingLoyaltySettings] = useState(false);
  const [sameAsAddress, setSameAsAddress] = useState(false);

  const fetchLoyaltySettings = async () => {
    try {
      setIsLoadingLoyaltySettings(true);
      const response = await fetch(getApiUrl('/loyalty-settings'));
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

  const [paymentTermsList, setPaymentTermsList] = useState<any[]>([]);

  const [isLoadingPaymentTerms, setIsLoadingPaymentTerms] = useState(false);
  const [isManagePaymentTermsOpen, setIsManagePaymentTermsOpen] = useState(false);
  const [isPaymentTermsSelectOpen, setIsPaymentTermsSelectOpen] = useState(false);

  const fetchPaymentTerms = async () => {
    try {
      setIsLoadingPaymentTerms(true);
      const response = await fetch(getApiUrl('/payment-terms'));
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

  useEffect(() => {
    if (isOpen) {
      fetchPriceLevels();

      fetchLoyaltySettings();
      fetchPaymentTerms();
    }
  }, [isOpen]);




  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerId: '',
      name: '',
      contactNumber: '',
      active: true,
      loyaltyPoints: 0,
      paymentTerms: '',
      address: '',
      billingAddress: '',
      discount: 0,
      creditLimit: 0,
      priceLevelId: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        // Editing mode - populate with customer data
        form.reset({
          customerId: customer.customerId || customer.id,
          name: customer.name || '',
          contactNumber: customer.contactNumber || '',
          active: customer.active !== undefined ? customer.active : true,
          loyaltyPoints: customer.loyaltyPoints || 0,
          paymentTerms: customer.paymentTerms || '',
          address: customer.address || '',
          billingAddress: customer.billingAddress || '',
          discount: customer.discount || 0,
          creditLimit: customer.creditLimit || 0,
          priceLevelId: customer.priceLevelId || '',
        });
      } else {
        // Adding mode - generate new ID and reset form
        const generatedId = 'CUST-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        form.setValue('customerId', generatedId);
        form.reset({
          customerId: generatedId,
          name: '',
          contactNumber: '',
          active: true,
          loyaltyPoints: 0,
          paymentTerms: '',
          address: '',
          billingAddress: '',
          discount: 0,
          creditLimit: 0,
          priceLevelId: '',
        });
      }
      setSameAsAddress(false);
    }
  }, [isOpen, customer, form]);

  async function onSubmit(values: CustomerFormValues) {
    setIsSaving(true);
    try {
      await onSave(values.customerId, values.name, values.contactNumber, values.active, values.loyaltyPoints, values.paymentTerms || '', values.address || '', values.billingAddress || '', values.discount, values.creditLimit, values.priceLevelId);
      await logActivity({
        action: customer ? 'UPDATE' : 'CREATE',
        module: 'CUSTOMERS',
        description: `${customer ? 'Updated' : 'Added'} customer: "${values.name}" (ID: ${values.customerId})`,
        referenceId: values.customerId,
      });
      toast({
        title: customer ? 'Customer Updated' : 'Customer Added',
        description: `Customer "${values.name}" has been successfully ${customer ? 'updated' : 'added'}.`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to add customer', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add customer. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl h-[650px] flex flex-col !overflow-hidden !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? 'Update the customer details below.' : 'Fill in the details below to add a new customer.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 px-4 py-1">
          <Form {...form}>
            <form id="add-customer-form" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="h-[480px]">
                <Tabs defaultValue="basic" className="w-full h-full">
              <TabsList className="grid w-fit grid-cols-3 mx-auto">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 p-6 h-[400px]">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-generated" {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

              <TabsContent value="address" className="space-y-4 p-6 h-[400px]">
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
              <TabsContent value="financial" className="space-y-4 p-6 h-[400px]">
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
                          value={field.value}
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
                                    setIsManagePaymentTermsOpen(true);
                                    setIsPaymentTermsSelectOpen(false);
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
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
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
                                  <SelectItem key={setting.id} value={setting.amount.toString()}>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
          <Button type="submit" form="add-customer-form" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {customer ? 'Updating Customer...' : 'Adding Customer...'}
              </>
            ) : (
              customer ? 'Update Customer' : 'Add Customer'
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

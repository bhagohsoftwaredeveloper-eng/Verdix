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
import { Loader2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Customer, SalesPerson } from '@/lib/types';

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
  salesPerson: z.string().optional(),
  salesArea: z.string().optional(),
  salesGroup: z.string().optional(),
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
  children: React.ReactNode;
}

import { AddSalesAreaDialog } from './add-sales-area-dialog';

import { AddSalesGroupDialog } from './add-sales-group-dialog';

export default function EditCustomerDialog({ customer, onSave, children }: EditCustomerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [priceLevels, setPriceLevels] = useState<any[]>([]);
  const [isLoadingPriceLevels, setIsLoadingPriceLevels] = useState(false);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [isLoadingSalesPersons, setIsLoadingSalesPersons] = useState(false);
  const [salesAreas, setSalesAreas] = useState<any[]>([]);
  const [isLoadingSalesAreas, setIsLoadingSalesAreas] = useState(false);
  const [salesGroups, setSalesGroups] = useState<any[]>([]);
  const [isLoadingSalesGroups, setIsLoadingSalesGroups] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySetting[]>([]);
  const [isLoadingLoyaltySettings, setIsLoadingLoyaltySettings] = useState(false);
  const { toast } = useToast();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer.name,
      contactNumber: customer.contactNumber,
      active: customer.active === undefined ? true : !!customer.active,
      salesPerson: customer.salesPerson || '',
      salesArea: customer.salesArea || '',
      salesGroup: customer.salesGroup || '',
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
        salesPerson: customer.salesPerson || '',
        salesArea: customer.salesArea || '',
        salesGroup: customer.salesGroup || '',
        loyaltyPoints: customer.loyaltyPoints || 0,
        paymentTerms: customer.paymentTerms || '',
        address: customer.address || '',
        billingAddress: customer.billingAddress || '',
        discount: customer.discount || 0,
        creditLimit: customer.creditLimit || 0,
        priceLevelId: customer.priceLevelId || '',
      });
      fetchPriceLevels();
      fetchSalesPersons();
      fetchSalesAreas();
      fetchSalesGroups();
      fetchLoyaltySettings();
    }
  }, [isOpen, customer, form]);

  const fetchSalesGroups = async () => {
    try {
      setIsLoadingSalesGroups(true);
      const response = await fetch('/api/sales-groups?activeOnly=true');
      const result = await response.json();
      if (result.success) {
        setSalesGroups(result.data);
      }
    } catch (error) {
      console.error('Error fetching sales groups:', error);
    } finally {
      setIsLoadingSalesGroups(false);
    }
  };

  const handleGroupAdded = (newGroup: { id: string; name: string }) => {
    setSalesGroups(prev => [...prev, newGroup]);
    form.setValue('salesGroup', newGroup.name);
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

  const fetchSalesPersons = async () => {
    try {
      setIsLoadingSalesPersons(true);
      const response = await fetch('/api/sales-persons?activeOnly=true');
      const result = await response.json();

      if (result.success) {
        setSalesPersons(result.data);
      } else {
        console.error('Failed to fetch sales persons:', result.error);
      }
    } catch (error) {
      console.error('Error fetching sales persons:', error);
    } finally {
      setIsLoadingSalesPersons(false);
    }
  };

  const fetchSalesAreas = async () => {
    try {
      setIsLoadingSalesAreas(true);
      const response = await fetch('/api/sales-areas?activeOnly=true');
      const result = await response.json();
      if (result.success) {
        setSalesAreas(result.data);
      }
    } catch (error) {
      console.error('Error fetching sales areas:', error);
    } finally {
      setIsLoadingSalesAreas(false);
    }
  };

  const handleAreaAdded = (newArea: { id: string; name: string }) => {
    setSalesAreas(prev => [...prev, newArea]);
    form.setValue('salesArea', newArea.name);
  };

  const fetchLoyaltySettings = async () => {
    try {
      setIsLoadingLoyaltySettings(true);
      const response = await fetch('/api/loyalty-settings');
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

  async function onSubmit(values: CustomerFormValues) {
    setIsSaving(true);
    try {
      await onSave(values);
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl h-[600px] flex flex-col overflow-hidden" style={{ height: '550px' }}>
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
              <TabsList className="grid w-fit grid-cols-4 mx-auto">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="sales">Sales Info</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 p-6 h-[450px] overflow-y-auto">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <TabsContent value="sales" className="space-y-4 p-6 h-[450px] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salesPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Person</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Sales Person" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingSalesPersons ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : (
                              salesPersons?.map(salesPerson => (
                                <SelectItem key={salesPerson.id} value={salesPerson.name}>
                                  {salesPerson.name}
                                  {salesPerson.contactNumber && ` (${salesPerson.contactNumber})`}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salesArea"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Sales Area</FormLabel>
                          <AddSalesAreaDialog 
                            onAreaAdded={handleAreaAdded} 
                            onSalesAreasUpdated={fetchSalesAreas}
                          />
                        </div>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Sales Area" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingSalesAreas ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : (
                              salesAreas?.map(area => (
                                <SelectItem key={area.id} value={area.name}>
                                  {area.name}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salesGroup"
                    render={({ field }) => (

                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Sales Group</FormLabel>
                          <AddSalesGroupDialog 
                            onGroupAdded={handleGroupAdded} 
                            onSalesGroupsUpdated={fetchSalesGroups}
                          />
                        </div>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Sales Group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingSalesGroups ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : (
                              salesGroups?.map(group => (
                                <SelectItem key={group.id} value={group.name}>
                                  {group.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loyaltyPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loyalty Points Setting</FormLabel>
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
                            ) : (
                              <>
                                <SelectItem value="0">None (0 points)</SelectItem>
                                {loyaltySettings.map((setting) => (
                                  <SelectItem key={setting.id} value={Number(setting.amount).toString()}>
                                    {setting.description} ({setting.amount} points)
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                          <Textarea placeholder="e.g., 123 Main St, City, Country" {...field} rows={2} />
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
                        <FormLabel>Billing Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., 123 Main St, City, Country" {...field} rows={2} />
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
                      <FormControl>
                        <Input placeholder="e.g., Net 30" {...field} />
                      </FormControl>
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
                <FormField
                  control={form.control}
                  name="priceLevelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Price Level</FormLabel>
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
  );
}

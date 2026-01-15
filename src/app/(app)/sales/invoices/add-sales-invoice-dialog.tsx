'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Loader2, Trash2, Plus, CalendarIcon, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product, Customer, Sale, PaymentMethod, Warehouse, SalesPerson } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent } from '@/components/ui/card';
import { ManageCustomersDialog } from '../ManageCustomersDialog';
import { CustomerSelectionField } from './customer-selection-field';
import { ManagePaymentMethodsDialog } from '../ManagePaymentMethodsDialog';
import { ManageWarehousesDialog } from '../ManageWarehousesDialog';
import { ManageSalesPersonsDialog } from '../ManageSalesPersonsDialog';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

import { useProducts, useCustomers } from '@/hooks/use-api';

const salesOrderItemSchema = z.object({
  product: z.any(),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().nonnegative(),
});

const salesOrderSchema = z.object({
  customer: z.any().refine(val => val && typeof val === 'object' && val.id, 'Customer is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().optional(),
  reference: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  shipping: z.coerce.number().nonnegative().optional(),
  warehouse: z.string().optional(),
  salesPerson: z.string().optional(),
  depositAccount: z.string().optional(),
  note: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
});

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>;

function ProductSelector({ onSelectProduct }: { onSelectProduct: (product: Product) => void }) {
  const { products, loading, error } = useProducts();
  const [inputValue, setInputValue] = useState('');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const handleScanOrPunch = () => {
    if (!inputValue.trim()) return;

    // Find product by barcode, SKU, or name (case insensitive)
    const product = products.find(p =>
      p.barcode?.toLowerCase() === inputValue.toLowerCase() ||
      p.sku?.toLowerCase() === inputValue.toLowerCase() ||
      p.name.toLowerCase() === inputValue.toLowerCase()
    );

    if (product) {
      onSelectProduct(product);
      setInputValue('');
    } else {
      // Could add a toast notification here for not found
      console.log('Product not found');
    }
  };

  return (
    <>
      <div className="relative pb-2">
        <Input
          placeholder="Scan barcode, enter SKU, or type product name"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleScanOrPunch()}
          className="pr-10"
        />
        <Search
          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
          onClick={() => setSearchDialogOpen(true)}
        />
      </div>

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search Products</DialogTitle>
            <DialogDescription>
              Search and select a product to add to the sales invoice.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="text-sm text-muted-foreground">Loading products...</div>
            </div>
          ) : error ? (
            <div className="text-sm text-destructive py-4">
              Error loading products: {error}
            </div>
          ) : (
            <Command>
              <CommandInput placeholder="Type product name, SKU, or barcode..." />
              <CommandList>
                <CommandEmpty>No products found.</CommandEmpty>
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.sku || ''} ${product.barcode || ''}`}
                      onSelect={() => {
                        onSelectProduct(product);
                        setSearchDialogOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-muted-foreground">
                          SKU: {product.sku || 'N/A'} | Barcode: {product.barcode || 'N/A'} | Stock: {product.stock}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


interface AddSalesInvoiceDialogProps {
  onSuccess?: () => void;
}

export function AddSalesInvoiceDialog({ onSuccess }: AddSalesInvoiceDialogProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [isLoadingSalesPersons, setIsLoadingSalesPersons] = useState(false);
  const { toast } = useToast();
  const { customers } = useCustomers();

  const totalSteps = 2;

  // Fetch payment methods from API
  const fetchPaymentMethods = async () => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await fetch('/api/payment-methods?activeOnly=true');
      const result = await response.json();

      if (result.success) {
        setPaymentMethods(result.data);
      } else {
        console.error('Failed to fetch payment methods:', result.error);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  // Fetch warehouses from API
  const fetchWarehouses = async () => {
    try {
      setIsLoadingWarehouses(true);
      const response = await fetch('/api/warehouses?activeOnly=true');
      const result = await response.json();

      if (result.success) {
        setWarehouses(result.data);
      } else {
        console.error('Failed to fetch warehouses:', result.error);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setIsLoadingWarehouses(false);
    }
  };

  // Fetch sales persons from API
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

  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
      fetchWarehouses();
      fetchSalesPersons();
    }
  }, [isOpen]);

  // Generate auto reference number
  const generateReference = () => {
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `INV-${randomNum}`;
  };

  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      customer: undefined,
      invoiceDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      dueDate: '',
      reference: generateReference(),
      deliveryAddress: '',
      paymentMethod: '',
      depositAccount: '',
      note: '',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const [total, setTotal] = useState(0);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items') || name === 'shipping') {
        const itemsTotal = (value.items || []).reduce((acc: number, item: any) => {
          const price = item?.price || 0;
          const quantity = item?.quantity || 0;
          return acc + (price * quantity);
        }, 0);
        const shippingCost = value.shipping || 0;
        setTotal(itemsTotal + shippingCost);
      }
    });

    // Initial calculation
    const currentValues = form.getValues();
    const itemsTotal = (currentValues.items || []).reduce((acc: number, item: any) => {
      const price = item?.price || 0;
      const quantity = item?.quantity || 0;
      return acc + (price * quantity);
    }, 0);
    const shippingCost = currentValues.shipping || 0;
    setTotal(itemsTotal + shippingCost);

    return () => subscription.unsubscribe();
  }, []);

  const watchedCustomer = form.watch('customer');
  const watchedInvoiceDate = form.watch('invoiceDate');
  const watchedPaymentMethod = form.watch('paymentMethod');
  const watchedCustomerId = watchedCustomer?.id || '';

  useEffect(() => {
    if (!watchedInvoiceDate) return;

    const customer = watchedCustomer;
    let calculatedDueDate = watchedInvoiceDate;

    const immediatePaymentMethods = ['Cash', 'PayPal', 'GCash'];
    if (watchedPaymentMethod && immediatePaymentMethods.includes(watchedPaymentMethod)) {
      form.setValue('dueDate', calculatedDueDate);
      return;
    }

    if (customer?.paymentTerms) {
      const terms = customer.paymentTerms.toLowerCase();
      if (terms === 'due on receipt') {
        calculatedDueDate = watchedInvoiceDate;
      } else {
        const netMatch = terms.match(/net (\d+)/);
        if (netMatch) {
          const days = parseInt(netMatch[1], 10);
          calculatedDueDate = addDays(new Date(watchedInvoiceDate), days).toISOString().split('T')[0];
        }
      }
    }

    form.setValue('dueDate', calculatedDueDate, { shouldValidate: true });
  }, [watchedCustomerId, watchedInvoiceDate, watchedPaymentMethod]);


  const handleAddProduct = (product: Product) => {
    const existingItemIndex = fields.findIndex(field => field.product.id === product.id);
    if (existingItemIndex !== -1) {
      const existingItem = fields[existingItemIndex];
      update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + 1 });
    } else {
      append({ product, quantity: 1, price: product.price });
    }
  };


  async function onSubmit(values: SalesOrderFormValues) {
    setIsSubmitting(true);

    try {
      const customer = values.customer;

      // Prepare the data for API call
      const saleData = {
        customer,
        invoiceDate: values.invoiceDate,
        dueDate: values.dueDate || '',
        reference: values.reference,
        deliveryAddress: values.deliveryAddress,
        paymentMethod: values.paymentMethod,
        shipping: values.shipping || 0,
        warehouse: values.warehouse,
        salesPerson: values.salesPerson,
        depositAccount: values.depositAccount,
        note: values.note,
        items: values.items,
      };

      // Call the API to create the sales invoice
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create sales invoice');
      }

      toast({
        title: 'Sales Invoice Created',
        description: `Invoice for ${customer.name} has been created successfully.`,
      });

      // Call the success callback to refresh the list
      if (onSuccess) {
        onSuccess();
      }

      form.reset();
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding sales invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem adding the sales invoice. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) setCurrentStep(1); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Sales Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl h-[700px] flex flex-col overflow-hidden" style={{ height: '700px' }}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add New Sales Invoice</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new sales invoice.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <div className="space-y-6">
            {currentStep === 1 && (
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <Label className="text-lg font-semibold text-foreground">Customer Information</Label>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <CustomerSelectionField
                        control={form.control}
                        customerList={customers}
                      />
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Payment Method</FormLabel>
                              <div className="ml-auto">
                                <ManagePaymentMethodsDialog
                                  trigger={<Button variant="link" size="sm" type="button">Manage</Button>}
                                  onChange={fetchPaymentMethods}
                                />
                              </div>
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a payment method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {paymentMethods?.map(method => <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <Label className="text-lg font-semibold text-foreground">Invoice Details</Label>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="invoiceDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="reference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reference</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter reference number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="depositAccount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deposit Account</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a deposit account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cash">Cash Account</SelectItem>
                                <SelectItem value="bank">Bank Account</SelectItem>
                                <SelectItem value="petty-cash">Petty Cash</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <Label className="text-lg font-semibold text-foreground">Shipping Information</Label>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="deliveryAddress"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Delivery Address</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter delivery address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shipping"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Shipping Cost</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="warehouse"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Warehouse</FormLabel>
                                <div className="ml-auto">
                                  <ManageWarehousesDialog
                                    trigger={<Button variant="link" size="sm" type="button">Manage</Button>}
                                    onChange={fetchWarehouses}
                                  />
                                </div>
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select warehouse" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {warehouses?.map(warehouse => (
                                    <SelectItem key={warehouse.id} value={warehouse.name}>
                                      {warehouse.name}
                                      {warehouse.location && ` (${warehouse.location})`}
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
                          name="salesPerson"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Sales Person</FormLabel>
                                <div className="ml-auto">
                                  <ManageSalesPersonsDialog
                                    trigger={<Button variant="link" size="sm" type="button">Manage</Button>}
                                    onChange={fetchSalesPersons}
                                  />
                                </div>
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select sales person" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {salesPersons?.map(salesPerson => (
                                    <SelectItem key={salesPerson.id} value={salesPerson.name}>
                                      {salesPerson.name}
                                      {salesPerson.contactNumber && ` (${salesPerson.contactNumber})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                              <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Enter any additional notes..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-2">
                <Label>Items</Label>
                <ProductSelector onSelectProduct={handleAddProduct} />
                <Card>
                  <CardContent className="p-4 h-96 overflow-y-auto">
                    <Table className="relative w-full overflow-visible caption-bottom text-sm">
                      <TableHeader className="sticky top-0 bg-background z-10 [&_tr]:border-b">
                        <TableRow>
                          <TableHead className='w-2/5'>Product</TableHead>
                          <TableHead className='w-1/5'>Quantity</TableHead>
                          <TableHead className='w-1/5'>Price (₱)</TableHead>
                          <TableHead className='w-1/5 text-right'>Subtotal</TableHead>
                          <TableHead className='w-px'></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>{field.product.name}</TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <Input type="number" {...field} />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.price`}
                                render={({ field }) => (
                                  <Input type="number" step="0.01" {...field} readOnly />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              ₱{(form.watch(`items.${index}.price`) * form.watch(`items.${index}.quantity`)).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</p>}
                <div className="flex justify-end items-center space-x-4">
                  <span className="text-lg font-semibold">Items: {fields.length} | Total:</span>
                  <span className="text-2xl font-bold">₱{total.toFixed(2)}</span>
                </div>
              </div>
            )}


            <DialogFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))} disabled={currentStep === 1}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                {currentStep < totalSteps ? (
                  <Button type="button" onClick={() => setCurrentStep(prev => prev + 1)}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Sales Invoice'
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

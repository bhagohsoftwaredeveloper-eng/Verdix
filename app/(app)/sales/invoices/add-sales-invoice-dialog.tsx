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
import { PlusCircle, Loader2, Trash2, Plus, Search, ArrowRight, CreditCard, Warehouse as WarehouseIcon, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product, Customer, Sale, PaymentMethod, Warehouse, SalesPerson } from '@/lib/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ManageCustomersDialog } from '../ManageCustomersDialog';
import { ManagePaymentMethodsDialog } from '../ManagePaymentMethodsDialog';
import { ManageWarehousesDialog } from '../ManageWarehousesDialog';
import { ManageSalesPersonsDialog } from '../ManageSalesPersonsDialog';
import { CustomerSelectionField } from './customer-selection-field';

import { useProducts, useCustomers } from '@/hooks/use-api';
import { format, addDays } from 'date-fns';

const salesInvoiceItemSchema = z.object({
  product: z.any(), // Keep full product object
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().nonnegative(),
});

const salesInvoiceSchema = z.object({
  customer: z.any().refine(val => val && typeof val === 'object' && val.id, 'Customer is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  deliveryDate: z.string().optional(),
  dueDate: z.string().optional(),
  reference: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  shipping: z.coerce.number().nonnegative().optional(),
  warehouse: z.string().optional(),
  salesPerson: z.string().optional(),
  depositAccount: z.string().optional(),
  note: z.string().optional(),
  items: z.array(salesInvoiceItemSchema).min(1, 'At least one item is required'),
});

type SalesInvoiceFormValues = z.infer<typeof salesInvoiceSchema>;

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
          className="pr-10 bg-white"
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [isLoadingSalesPersons, setIsLoadingSalesPersons] = useState(false);
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const { toast } = useToast();
  const { customers } = useCustomers();

  // Generate auto reference number
  const generateReference = () => {
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `INV-${randomNum}`;
  };

  const form = useForm<SalesInvoiceFormValues>({
    resolver: zodResolver(salesInvoiceSchema),
    defaultValues: {
      customer: undefined,
      invoiceDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      deliveryDate: '',
      dueDate: new Date().toISOString().split('T')[0], // Today's date as default due date
      reference: '',
      deliveryAddress: '',
      paymentMethod: '',
      depositAccount: '',
      items: [],
      shipping: 0,
      note: '',
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

  // Auto-generate reference when dialog opens
  useEffect(() => {
    if (isOpen) {
      const autoReference = generateReference();
      form.setValue('reference', autoReference);
      fetchWarehouses();
      fetchPaymentMethods();
      fetchSalesPersons();
    }
  }, [isOpen, form]);

  const watchedCustomer = form.watch('customer');
  const watchedInvoiceDate = form.watch('invoiceDate');
  const watchedPaymentMethod = form.watch('paymentMethod');

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
  }, [watchedCustomer, watchedInvoiceDate, watchedPaymentMethod]);

  const handleAddProduct = (product: Product) => {
    const existingItemIndex = fields.findIndex(field => field.product.id === product.id);
    if(existingItemIndex !== -1) {
        const existingItem = fields[existingItemIndex];
        update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + 1 });
    } else {
        append({ product, quantity: 1, price: product.price });
    }
  };


  async function onSubmit(values: SalesInvoiceFormValues) {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sales Invoice Added',
          description: `Sales Invoice ${values.reference} has been successfully created.`,
        });

        form.reset();
        setIsOpen(false);
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create sales invoice',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating sales invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to create sales invoice',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Sales Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 gap-0 bg-background">
        <DialogHeader className="px-6 py-4 border-b bg-background">
          <DialogTitle>New Sales Invoice</DialogTitle>
          <DialogDescription>
            Create a transaction. Reference: <span className="font-mono font-medium text-primary">{form.watch('reference')}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              {/* LEFT SIDEBAR - DETAILS */}
              <div className="w-[400px] border-r bg-background flex flex-col overflow-y-auto p-5 gap-6">
                
                {/* Section: Customer */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"/> Customer & Payment
                  </h3>
                  <div className="space-y-4 pl-3">
                     <CustomerSelectionField
                        control={form.control}
                        customerList={customers}
                        className="bg-white"
                      />
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Payment Method</FormLabel>
                            <div className="flex gap-2">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                   <div className="p-2 border-b sticky top-0 bg-popover z-10">
                                      <Button
                                        variant="secondary"
                                        className="w-full justify-start h-8 px-2 text-sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setShowPaymentMethodDialog(true);
                                        }}
                                      >
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Manage Methods
                                      </Button>
                                   </div>
                                   {isLoadingPaymentMethods ? (
                                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                                  ) : (
                                    paymentMethods?.map(method => <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>)
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <ManagePaymentMethodsDialog 
                              open={showPaymentMethodDialog} 
                              onOpenChange={setShowPaymentMethodDialog}
                              onChange={fetchPaymentMethods}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="depositAccount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Deposit Account</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Select account" />
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
                </div>

                <hr className="border-border/50"/>

                {/* Section: Invoice Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"/> Invoice Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4 pl-3">
                     <FormField
                        control={form.control}
                        name="invoiceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Invoice Date</FormLabel>
                            <FormControl>
                              <Input type="date" className="bg-white" {...field} />
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
                            <FormLabel className="text-xs">Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" className="bg-white" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="warehouse"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-xs">Warehouse</FormLabel>
                            <div className="flex gap-2">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select warehouse" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="p-2 border-b sticky top-0 bg-popover z-10">
                                      <Button
                                        variant="secondary"
                                        className="w-full justify-start h-8 px-2 text-sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setShowWarehouseDialog(true);
                                        }}
                                      >
                                        <WarehouseIcon className="mr-2 h-4 w-4" />
                                        Manage Warehouses
                                      </Button>
                                   </div>
                                  {warehouses?.map(warehouse => (
                                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                      {warehouse.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <ManageWarehousesDialog
                              open={showWarehouseDialog}
                              onOpenChange={setShowWarehouseDialog}
                              onChange={fetchWarehouses}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salesPerson"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-xs">Sales Person</FormLabel>
                            <div className="flex gap-2">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select agent" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="p-2 border-b sticky top-0 bg-popover z-10">
                                      <Button
                                        variant="secondary"
                                        className="w-full justify-start h-8 px-2 text-sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setShowSalesPersonDialog(true);
                                        }}
                                      >
                                        <Users className="mr-2 h-4 w-4" />
                                        Manage Sales Persons
                                      </Button>
                                   </div>
                                  {salesPersons?.map(person => (
                                    <SelectItem key={person.id} value={person.id.toString()}>
                                      {person.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <ManageSalesPersonsDialog
                                open={showSalesPersonDialog}
                                onOpenChange={setShowSalesPersonDialog}
                                onChange={fetchSalesPersons}
                              />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shipping"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Shipping Cost</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" className="bg-white" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                          control={form.control}
                          name="reference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Reference</FormLabel>
                              <FormControl>
                                <Input className="bg-white" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                  </div>
                </div>

                <hr className="border-border/50"/>
                 
                {/* Section: Delivery */}
                <div className="space-y-3">
                   <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"/> Delivery
                  </h3>
                   <div className="space-y-4 pl-3">
                     <FormField
                        control={form.control}
                        name="deliveryAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Full delivery address" className="bg-white" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="deliveryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Date</FormLabel>
                            <FormControl>
                              <Input type="date" className="bg-white" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                   </div>
                </div>

              </div>
              
              {/* RIGHT MAIN - ITEMS */}
              <div className="flex-1 flex flex-col bg-muted/5 p-6 overflow-hidden">
                <div className="mb-4">
                  <ProductSelector onSelectProduct={handleAddProduct} />
                </div>

                <div className="flex-1 rounded-lg border bg-background shadow-sm overflow-hidden flex flex-col">
                  {/* Table Header */}
                   <div className="overflow-y-auto flex-1 relative">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/50 z-10 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className='w-[40%] pl-4'>Product</TableHead>
                          <TableHead className='w-[15%] text-center'>Qty</TableHead>
                          <TableHead className='w-[20%] text-right'>Price</TableHead>
                          <TableHead className='w-[20%] text-right pr-4'>Total</TableHead>
                          <TableHead className='w-[5%]'></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-[300px] text-center text-muted-foreground flex flex-col items-center justify-center border-none">
                                    <Search className="h-10 w-10 mb-2 opacity-20"/>
                                    <p>No items added.</p>
                                    <p className="text-xs">Scan or search products to begin.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            fields.map((field, index) => (
                          <TableRow key={field.id} className="group bg-white">
                            <TableCell className="font-medium pl-4 py-2">
                                <div className="text-sm font-semibold">{field.product.name}</div>
                                <div className="text-xs text-muted-foreground flex gap-2">
                                  <span>{field.product.sku || 'No SKU'}</span>
                                  {field.product.stock !== undefined && (
                                    <span className={field.product.stock <= 0 ? "text-destructive" : "text-emerald-600"}>
                                      Stock: {field.product.stock}
                                    </span>
                                  )}
                                </div>
                            </TableCell>
                            <TableCell className="py-2">
                             <div className="flex justify-center">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.quantity`}
                                  render={({ field }) => (
                                    <Input 
                                      type="number" 
                                      className="h-8 w-20 text-center bg-white" 
                                      {...field} 
                                      onFocus={(e) => e.target.select()}
                                    />
                                  )}
                                />
                             </div>
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <FormField
                                control={form.control}
                                name={`items.${index}.price`}
                                render={({ field }) => (
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    className="h-8 w-24 text-right ml-auto border-transparent hover:border-input focus:border-input bg-white" 
                                    {...field} 
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-right py-2 pr-4 font-mono">
                              ₱{(form.watch(`items.${index}.price`) * form.watch(`items.${index}.quantity`)).toFixed(2)}
                            </TableCell>
                            <TableCell className="py-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )))}
                      </TableBody>
                    </Table>
                   </div>
                </div>

                {/* Footer / Summary Area */}
                <div className="mt-6 grid grid-cols-12 gap-6">
                   {/* Left: Notes */}
                   <div className="col-span-7">
                      <FormField
                          control={form.control}
                          name="note"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Notes / Remarks</FormLabel>
                              <FormControl>
                                <textarea
                                  className="flex h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                  placeholder="Internal notes..."
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                   </div>

                   {/* Right: Totals */}
                   <div className="col-span-5 bg-card rounded-lg border p-4 shadow-sm space-y-3">
                      <div className="flex justify-between text-sm">
                         <span className="text-muted-foreground">Subtotal ({fields.length} items)</span>
                         <span>₱{(total - (form.watch('shipping') || 0)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-muted-foreground">Shipping</span>
                         <span>₱{(form.watch('shipping') || 0).toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between items-end">
                         <span className="font-semibold text-lg">Total</span>
                         <span className="font-bold text-2xl text-primary">₱{total.toFixed(2)}</span>
                      </div>
                   </div>
                </div>

              </div>
            </div>

            <DialogFooter className="p-4 bg-background border-t">
               <div className="flex items-center text-xs text-muted-foreground mr-auto">
                 <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Ready to process</span>
               </div>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || fields.length === 0} className="w-40 font-semibold shadow-lg shadow-primary/20">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Create Invoice <ArrowRight className="ml-2 h-4 w-4"/></>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

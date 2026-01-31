
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mockCustomers } from '@/lib/data';
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
import { PlusCircle, Loader2, Trash2, Plus, Search, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product, Customer, Sale, PaymentMethod, Warehouse, SalesPerson } from '@/lib/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ManageCustomersDialog } from '../ManageCustomersDialog';
import { ManagePaymentMethodsDialog } from '../ManagePaymentMethodsDialog';
import { ManageWarehousesDialog, WarehouseDialog as AddWarehouseDialog } from '../ManageWarehousesDialog';
import { ManageSalesPersonsDialog, SalesPersonDialog as AddSalesPersonDialog } from '../ManageSalesPersonsDialog';
import { CustomerSelectionField } from '../invoices/customer-selection-field';

import { useProducts, useCustomers } from '@/hooks/use-api';
import { format, addDays } from 'date-fns';

const salesOrderItemSchema = z.object({
  product: z.any(), // Keep full product object
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().nonnegative(),
});

const salesOrderSchema = z.object({
  customer: z.any(), // Keep full customer object
  orderDate: z.string().min(1, 'Order date is required'),
  deliveryDate: z.string().optional(),
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
              Search and select a product to add to the sales order.
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


// ... (imports remain)

interface AddSalesOrderDialogProps {
  initialData?: Sale;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  hideTrigger?: boolean;
}

export function AddSalesOrderDialog({ initialData, isOpen: controlledIsOpen, onOpenChange: setControlledIsOpen, onSuccess, hideTrigger }: AddSalesOrderDialogProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = setControlledIsOpen || setInternalIsOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Lists
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [showAddWarehouseDialog, setShowAddWarehouseDialog] = useState(false);
  
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [isLoadingSalesPersons, setIsLoadingSalesPersons] = useState(false);
  const [showAddSalesPersonDialog, setShowAddSalesPersonDialog] = useState(false);
  
  const { toast } = useToast();
  const { customers, refetch: refetchCustomers } = useCustomers();

  // Generate auto reference number
  const generateReference = () => {
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `SO-${randomNum}`;
  };

  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      customer: undefined,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      reference: '',
      deliveryAddress: '',
      paymentMethod: '',
      depositAccount: '',
      items: [],
      shipping: 0,
      note: ''
    },
  });

  const { fields, append, remove, update, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

    // Populate form if initialData provided (Edit Mode)
    useEffect(() => {
        if (initialData && isOpen) {
            form.reset({
                customer: initialData.customer,
                orderDate: initialData.orderDate ? new Date(initialData.orderDate).toISOString().split('T')[0] : '',
                deliveryDate: initialData.deliveryDate ? new Date(initialData.deliveryDate).toISOString().split('T')[0] : '',
                reference: initialData.reference,
                deliveryAddress: initialData.deliveryAddress,
                paymentMethod: initialData.paymentMethod,
                // shipping not in Sale type directly but in API response, assume it maps if available. 
                // Since Sale type might be incomplete locally vs API full response, we guard.
                shipping: (initialData as any).shipping || 0, 
                warehouse: (initialData as any).warehouse_id, 
                salesPerson: (initialData as any).sales_person_id,
                note: initialData.notes,
                items: initialData.items.map(item => ({
                    product: item.product,
                    quantity: item.quantity,
                    price: item.price
                }))
            });
             // Trigger fetchers
            fetchWarehouses();
            fetchPaymentMethods();
            fetchSalesPersons();
        } else if (isOpen && !initialData) {
            // New Mode - generate ref if empty
             const autoReference = generateReference();
             form.setValue('reference', autoReference);
             fetchWarehouses();
             fetchPaymentMethods();
             fetchSalesPersons();
        }
    }, [initialData, isOpen, form]);


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

  const handleAddWarehouse = async (name: string, location?: string) => {
    try {
      const response = await fetch('/api/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, location }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to add warehouse');
      }

      await fetchWarehouses();
    } catch (error) {
      console.error('Error adding warehouse:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add warehouse.',
      });
      throw error;
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

  const handleAddSalesPerson = async (name: string, contactNumber?: string) => {
    try {
      const response = await fetch('/api/sales-persons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, contactNumber }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to add sales person');
      }

      await fetchSalesPersons();
    } catch (error) {
      console.error('Error adding sales person:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add sales person.',
      });
      throw error;
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

  const handleAddProduct = (product: Product) => {
    const existingItemIndex = fields.findIndex(field => field.product.id === product.id);
    if(existingItemIndex !== -1) {
        const existingItem = fields[existingItemIndex];
        update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + 1 });
    } else {
        append({ product, quantity: 1, price: product.price });
    }
  };

  async function onSubmit(values: SalesOrderFormValues) {
    try {
      setIsSubmitting(true);

      const url = initialData ? `/api/sales/orders/${initialData.id}` : '/api/sales/orders';
      const method = initialData ? 'PUT' : 'POST';

      const bodyData = { 
          ...values, 
          status: initialData ? undefined : 'To Deliver' // Set status only for new orders if needed, or let API handle it.
          // Actually, 'To Deliver' is the requested default status.
      };
      // If editing, we shouldn't overwrite status unless explicitly changed, but here we just pass ...values.
      // Wait, values (from form) doesn't include status field.
      // So new orders get 'To Deliver'. Existing orders keep their status (handled by backend or we don't pass it).
      // But PUT endpoint expects full object or partial? My PUT implementation updates status if provided.
      // If I don't provide status in PUT body, what happens?
      // My backend PUT implementation: const { status ... } = body; ... status || 'Pending'.
      // So if I don't send status, it might reset to Pending!
      // I need to send existing status if editing.
      
      const payload = {
          ...values,
          status: initialData ? initialData.status : 'To Deliver'
      };

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: initialData ? 'Sales Order Updated' : 'Sales Order Added',
          description: `Sales order ${data.data.id} has been successfully ${initialData ? 'updated' : 'created'}.`,
        });

        if (!initialData) form.reset(); // Only reset if new, or maybe always reset?
        setIsOpen(false);
        if (onSuccess) onSuccess();
        else window.location.reload(); // Fallback
      } else {
        toast({
          title: 'Error',
          description: data.error || `Failed to ${initialData ? 'update' : 'create'} sales order`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving sales order:', error);
      toast({
        title: 'Error',
        description: `Failed to ${initialData ? 'update' : 'create'} sales order`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!initialData && !hideTrigger && (
          <DialogTrigger asChild>
            <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Sales Order
            </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-[100vw] w-full h-screen max-h-screen flex flex-col p-0 gap-0 bg-background border-none rounded-none">
        <DialogHeader className="px-6 py-4 border-b bg-background">
          <DialogTitle>New Sales Order</DialogTitle>
          <DialogDescription>
            Create a sales transaction. Reference: <span className="font-mono font-medium text-primary">{form.watch('reference')}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden bg-muted/10">
              
              {/* TOP HEADER - Form Fields (Compact Grid) */}
              <div className="bg-background border-b p-4 grid grid-cols-4 gap-4 shrink-0">
                  
                  {/* Column 1: Customer & Sales Person */}
                  <div className="space-y-3">
                         <CustomerSelectionField
                            control={form.control}
                            customerList={customers}
                            className="bg-white h-8 text-xs"
                            onCustomerAdded={refetchCustomers}
                            labelClassName="text-xs font-semibold text-muted-foreground"
                        />

                      <FormField
                        control={form.control}
                        name="salesPerson"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs font-semibold text-muted-foreground">Sales Person</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-8 bg-white text-xs">
                                    <SelectValue placeholder="Select sales person" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="p-1 w-full border-b border-border mb-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start font-normal px-2 h-7 text-xs"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowAddSalesPersonDialog(true);
                                        }}
                                      >
                                        <Plus className="mr-2 h-3 w-3" /> Add Sales Person
                                      </Button>
                                   </div>
                                  {salesPersons?.map(person => (
                                    <SelectItem key={person.id} value={person.id.toString()} className="text-xs">
                                      {person.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                            </Select>
                             <AddSalesPersonDialog
                                open={showAddSalesPersonDialog}
                                onOpenChange={setShowAddSalesPersonDialog}
                                onSave={handleAddSalesPerson}
                              >
                                <div />
                              </AddSalesPersonDialog>
                          </FormItem>
                        )}
                      />
                  </div>

                  {/* Column 2: Dates & Warehouse */}
                  <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                            control={form.control}
                            name="orderDate"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Order Date</FormLabel>
                                <FormControl>
                                <Input type="date" className="h-8 bg-white text-xs" {...field} />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="deliveryDate"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Delivery Date</FormLabel>
                                <FormControl>
                                <Input type="date" className="h-8 bg-white text-xs" {...field} />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                      </div>
                       <FormField
                            control={form.control}
                            name="warehouse"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Warehouse</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                    <SelectValue placeholder="Select warehouse" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <div className="p-1 w-full border-b border-border mb-1">
                                      <Button
                                        variant="ghost" 
                                        size="sm"
                                        className="w-full justify-start font-normal px-2 h-7 text-xs"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowAddWarehouseDialog(true);
                                        }}
                                      >
                                        <Plus className="mr-2 h-3 w-3"/> Add Warehouse
                                      </Button>
                                    </div>
                                    {warehouses?.map(warehouse => (
                                    <SelectItem key={warehouse.id} value={warehouse.id.toString()} className="text-xs">
                                        {warehouse.name}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <AddWarehouseDialog
                                    open={showAddWarehouseDialog}
                                    onOpenChange={setShowAddWarehouseDialog}
                                    onSave={handleAddWarehouse}
                                >
                                    <div />
                                </AddWarehouseDialog>
                            </FormItem>
                            )}
                        />
                  </div>
                  
                  {/* Column 3: Payment & Shipping */}
                  <div className="space-y-3">
                       <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Payment Method</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                    <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <div className="p-1 w-full border-b border-border mb-1">
                                     <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start font-normal px-2 h-7 text-xs"
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setShowPaymentMethodDialog(true);
                                        }}
                                      >
                                        <Plus className="mr-2 h-3 w-3" />
                                        Manage Methods
                                      </Button>
                                    </div>
                                    {paymentMethods?.map(method => <SelectItem key={method.id} value={method.name} className="text-xs">{method.name}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                 <ManagePaymentMethodsDialog
                                    open={showPaymentMethodDialog}
                                    onOpenChange={setShowPaymentMethodDialog}
                                    onChange={fetchPaymentMethods}
                                />
                            </FormItem>
                            )}
                        />
                          <div className="grid grid-cols-2 gap-2">
                            <FormField
                                control={form.control}
                                name="shipping"
                                render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Shipping</FormLabel>
                                    <FormControl>
                                    <Input type="number" step="0.01" className="h-8 bg-white text-xs" {...field} />
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="depositAccount"
                                render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Deposit Acc</FormLabel>
                                    <FormControl>
                                    <Input className="h-8 bg-white text-xs" {...field} />
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                        </div>
                  </div>

                  {/* Column 4: Address / Notes */}
                  <div className="space-y-3">
                      <FormField
                            control={form.control}
                            name="deliveryAddress"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold text-muted-foreground">Address</FormLabel>
                                <FormControl>
                                <Input className="h-8 bg-white text-xs" placeholder="Deliver to..." {...field} />
                                </FormControl>
                            </FormItem>
                            )}
                       />
                       <FormField
                          control={form.control}
                          name="note"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold text-muted-foreground">Notes</FormLabel>
                              <FormControl>
                                <Input className="h-8 bg-white text-xs" placeholder="Brief notes..." {...field} value={field.value || ''} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                  </div>

              </div>

              {/* CENTER - ITEMS TABLE */}
              <div className="flex-1 flex flex-col overflow-hidden bg-muted/5 p-4 relative">
                  <div className="max-w-2xl mb-4 z-10">
                    <ProductSelector onSelectProduct={handleAddProduct} />
                  </div>
                  
                  <div className="flex-1 rounded-lg border bg-background shadow-sm overflow-hidden flex flex-col relative">
                      <div className="overflow-y-auto flex-1 h-full relative">
                        <table className="w-full caption-bottom text-sm text-left border-collapse">
                            <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                                <TableRow className="hover:bg-transparent border-b">
                                <TableHead className='w-[40%] pl-4 h-10'>Product</TableHead>
                                <TableHead className='w-[15%] text-center h-10'>Qty</TableHead>
                                <TableHead className='w-[20%] text-right h-10'>Price</TableHead>
                                <TableHead className='w-[20%] text-right pr-4 h-10'>Total</TableHead>
                                <TableHead className='w-[5%] h-10'></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-[300px] text-center text-muted-foreground flex flex-col items-center justify-center border-none">
                                            <div className="bg-muted p-4 rounded-full mb-4"><Search className="h-8 w-8 opacity-20"/></div>
                                            <p className="font-medium">No items added</p>
                                            <p className="text-xs text-muted-foreground">Scan barcode or search above to add products.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    fields.map((field, index) => (
                                    <TableRow key={field.id} className="group hover:bg-muted/50 border-b">
                                        <TableCell className="font-medium pl-4 py-2">
                                            <div className="font-medium">{field.product.name}</div>
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
                        </table>
                      </div>

                      {/* Footer Totals */}
                      <div className="bg-muted/30 p-4 border-t grid grid-cols-12 gap-4">
                          <div className="col-span-8">
                             {/* Optional Left content */}
                          </div>
                          <div className="col-span-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>₱{(total - (form.watch('shipping') || 0)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Shipping</span>
                                <span>₱{(form.watch('shipping') || 0).toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between items-center">
                                <span className="font-semibold text-lg">Total</span>
                                <span className="font-bold text-xl text-primary">₱{total.toFixed(2)}</span>
                            </div>
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
                  <>{initialData ? 'Update Order' : 'Create Order'} <ArrowRight className="ml-2 h-4 w-4"/></>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

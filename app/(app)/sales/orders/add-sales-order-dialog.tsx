
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Loader2, Trash2, Search, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product, Customer, Sale, PaymentMethod, Warehouse, SalesPerson } from '@/lib/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ManagePaymentMethodsDialog } from '../ManagePaymentMethodsDialog';
import { ManageWarehousesDialog } from '../ManageWarehousesDialog';
import { ManageSalesPersonsDialog } from '@/app/(app)/settings/pos-setup/manage-sales-persons-dialog';
import { CustomerSelectionField } from '../invoices/customer-selection-field';
import { useProducts, useCustomers } from '@/hooks/use-api';
import { getApiUrl } from '@/lib/api-config';

const salesOrderItemSchema = z.object({
  product: z.object({
    id: z.string().min(1, 'Product ID is required'),
    name: z.string().min(1, 'Product name is required'),
  }),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  price: z.coerce.number().nonnegative('Price cannot be negative'),
});

const salesOrderSchema = z.object({
  customer: z.object({
    id: z.string().min(1, 'Customer is required'),
    name: z.string().min(1, 'Customer name is required'),
  }, { required_error: 'Please select a customer' }),
  orderDate: z.string().min(1, 'Order date is required'),
  deliveryDate: z.string().optional(),
  reference: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  paymentReference: z.string().optional(),
  shipping: z.coerce.number().nonnegative().optional(),
  warehouse: z.string().optional(),
  salesPersonId: z.string().optional(),
  note: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
});

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>;

function ProductSelector({ onSelectProduct, warehouseId }: { onSelectProduct: (product: Product) => void, warehouseId?: string }) {
  const { products, loading, error } = useProducts(undefined, undefined, undefined, warehouseId);
  const [inputValue, setInputValue] = useState('');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const handleScanOrPunch = () => {
    if (!inputValue.trim()) return;

    const product = products.find(p =>
      p.barcode?.toLowerCase() === inputValue.toLowerCase() ||
      p.sku?.toLowerCase() === inputValue.toLowerCase() ||
      p.name.toLowerCase() === inputValue.toLowerCase()
    );

    if (product) {
      onSelectProduct(product);
      setInputValue('');
    } else {
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
          onKeyDown={(e) => e.key === 'Enter' && handleScanOrPunch()}
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

  // Payment methods - fetched directly (same as invoice dialog)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  // Warehouses - fetched directly (same as invoice dialog)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

  // Sales Persons
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [isLoadingSalesPersons, setIsLoadingSalesPersons] = useState(false);

  // Controlled manage dialog open states (same as invoice dialog)
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);

  const { toast } = useToast();
  const { customers, refetch: refetchCustomers } = useCustomers();

  // Generate auto reference number
  const generateReference = () => {
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `SO-${randomNum}`;
  };

  // Define refined schema inside the component to access paymentMethods state
  const refinedSchema = useMemo(() => salesOrderSchema.refine((data) => {
    const selectedMethod = paymentMethods.find(m => m.name === data.paymentMethod);
    if (selectedMethod?.isReferenceRequired && (!data.paymentReference || data.paymentReference.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: 'Payment reference is required for this method',
    path: ['paymentReference'],
  }), [paymentMethods]);

  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(refinedSchema),
    defaultValues: {
      customer: undefined,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      reference: '',
      deliveryAddress: '',
      paymentMethod: '',
      paymentReference: '',
      items: [],
      shipping: 0,
      salesPersonId: '',
      note: ''
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Fetch payment methods from API (same as invoice dialog)
  const fetchPaymentMethods = async () => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await fetch(getApiUrl('/payment-methods?activeOnly=true'));
      const result = await response.json();
      if (result.success) {
        // Explicitly map properties (same as invoice dialog)
        const mapped = result.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            isReferenceRequired: item.isReferenceRequired ?? false,
        }));
        setPaymentMethods(mapped);
      } else {
        console.error('Failed to fetch payment methods:', result.error);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  // Fetch warehouses from API (same as invoice dialog)
  const fetchWarehouses = async () => {
    try {
      setIsLoadingWarehouses(true);
      const response = await fetch(getApiUrl('/warehouses?activeOnly=true'));
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
      const response = await fetch(getApiUrl('/sales-persons?activeOnly=true'));
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

  // Populate form and fetch data when dialog opens (same as invoice dialog)
  useEffect(() => {
    const initializeForm = async () => {
      await Promise.all([fetchPaymentMethods(), fetchWarehouses(), fetchSalesPersons()]);

      if (initialData && isOpen) {
        form.reset({
          customer: initialData.customer,
          orderDate: initialData.orderDate ? new Date(initialData.orderDate).toISOString().split('T')[0] : '',
          deliveryDate: initialData.deliveryDate ? new Date(initialData.deliveryDate).toISOString().split('T')[0] : '',
          reference: initialData.reference,
          deliveryAddress: initialData.deliveryAddress,
          paymentMethod: initialData.paymentMethod,
          paymentReference: (initialData as any).paymentReference || '',
          shipping: (initialData as any).shipping || 0,
          warehouse: (initialData as any).warehouse_id,
          salesPersonId: initialData.salesPersonId || '',
          note: initialData.notes,
          items: initialData.items.map(item => ({
            product: item.product,
            quantity: item.quantity,
            price: item.price
          }))
        });
      } else if (isOpen && !initialData) {
        const autoReference = generateReference();
        form.setValue('reference', autoReference);
      }
    };

    if (isOpen) {
      initializeForm();
    }
  }, [isOpen]);


  const [total, setTotal] = useState(0);

  // Auto-populate Sales Person based on customer
  const watchedCustomerId = form.watch('customer.id');
  useEffect(() => {
    if (watchedCustomerId && !initialData) {
      const selectedCustomer = customers.find(c => c.id === watchedCustomerId);
      if (selectedCustomer?.salesPerson) {
        // Find matching sales person ID by name
        const matchingSP = salesPersons.find(sp => sp.name === selectedCustomer.salesPerson);
        if (matchingSP) {
          form.setValue('salesPersonId', matchingSP.id);
        }
      }
    }
  }, [watchedCustomerId, customers, salesPersons, initialData, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items') || name === 'shipping') {
        const itemsTotal = (value.items || []).reduce((acc: number, item: any) => {
          const price = item?.price || 0;
          const quantity = item?.quantity || 0;
          return acc + (price * quantity);
        }, 0);
        const shippingCost = Number(value.shipping || 0);
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
    const shippingCost = Number(currentValues.shipping || 0);
    setTotal(itemsTotal + shippingCost);

    return () => subscription.unsubscribe();
  }, []);

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

      const url = initialData ? getApiUrl(`/sales/orders/${initialData.id}`) : getApiUrl('/sales/orders');
      const method = initialData ? 'PUT' : 'POST';

      const payload = {
        ...values,
        salesPerson: values.salesPersonId, // Map to backend field
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

        if (!initialData) form.reset();
        setIsOpen(false);
        if (onSuccess) onSuccess();
        else window.location.reload();
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

  const watchedPaymentMethod = form.watch('paymentMethod');
  const selectedPaymentMethod = paymentMethods.find(m => m.name === watchedPaymentMethod);
  const isReferenceRequired = selectedPaymentMethod?.isReferenceRequired ?? false;

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
      <DialogContent className="sm:max-w-none max-w-full w-full h-screen max-h-screen flex flex-col p-0 gap-0 bg-background border-none rounded-none m-0 shadow-none">
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
                  
                  {/* Column 1: Customer & Address */}
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
                            name="deliveryAddress"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Address</FormLabel>
                                </div>
                                <FormControl>
                                <Input className="h-8 bg-white text-xs" {...field} />
                                </FormControl>
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
                                <div className="flex justify-between items-center w-full h-5">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Warehouse</FormLabel>
                                    <Button
                                        variant="link"
                                        className="h-auto p-0 text-xs text-primary"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowWarehouseDialog(true);
                                        }}
                                    >
                                        Manage
                                    </Button>
                                </div>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                    <SelectValue placeholder="Select warehouse" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {warehouses?.map(warehouse => (
                                    <SelectItem key={warehouse.id} value={warehouse.id.toString()} className="text-xs">
                                        {warehouse.name}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <ManageWarehousesDialog
                                    open={showWarehouseDialog}
                                    onOpenChange={setShowWarehouseDialog}
                                    onChange={fetchWarehouses}
                                />
                                <FormMessage className="text-xs" />
                            </FormItem>
                            )}
                        />
                  </div>
                  
                  {/* Column 3: Sales Person & Notes */}
                  <div className="space-y-3">
                        <FormField
                            control={form.control}
                            name="salesPersonId"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex justify-between items-center w-full h-5">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Sales Person</FormLabel>
                                    <Button
                                        variant="link"
                                        className="h-auto p-0 text-xs text-primary"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowSalesPersonDialog(true);
                                        }}
                                    >
                                        Manage
                                    </Button>
                                </div>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                    <SelectValue placeholder="Select sales person" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {salesPersons?.map(person => (
                                    <SelectItem key={person.id} value={person.id.toString()} className="text-xs">
                                        {person.name}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <ManageSalesPersonsDialog
                                    open={showSalesPersonDialog}
                                    onOpenChange={setShowSalesPersonDialog}
                                    onChange={fetchSalesPersons}
                                />
                                <FormMessage className="text-xs" />
                            </FormItem>
                            )}
                        />
                        <FormField
                          control={form.control}
                          name="note"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <div className="flex items-center justify-between h-5">
                                  <FormLabel className="text-xs font-semibold text-muted-foreground">Notes</FormLabel>
                              </div>
                              <FormControl>
                                <Input className="h-8 bg-white text-xs" placeholder="Brief notes..." {...field} value={field.value || ''} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                  </div>

                  {/* Column 4: Payment & Reference & Shipping */}
                  <div className="space-y-3">
                      <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex justify-between items-center w-full h-5">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Payment Method</FormLabel>
                                    <Button
                                        variant="link"
                                        className="h-auto p-0 text-xs text-primary"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowPaymentMethodDialog(true);
                                        }}
                                    >
                                        Manage
                                    </Button>
                                </div>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                    <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {paymentMethods?.map(method => <SelectItem key={method.id} value={method.name} className="text-xs">{method.name}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <ManagePaymentMethodsDialog
                                    open={showPaymentMethodDialog}
                                    onOpenChange={setShowPaymentMethodDialog}
                                    onChange={fetchPaymentMethods}
                                />
                                <FormMessage className="text-xs" />
                            </FormItem>
                            )}
                        />
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                            control={form.control}
                            name="paymentReference"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">
                                        {isReferenceRequired ? (
                                            <>Ref <span className="text-destructive">*</span></>
                                        ) : (
                                            'Ref'
                                        )}
                                    </FormLabel>
                                </div>
                                <FormControl>
                                    <Input 
                                      className="h-8 bg-white text-xs" 
                                      placeholder={isReferenceRequired ? "Req..." : "Opt..."} 
                                      {...field} 
                                      value={field.value || ''} 
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                            )}
                        />
                        <FormField
                              control={form.control}
                              name="shipping"
                              render={({ field }) => (
                              <FormItem className="space-y-1">
                                  <div className="flex items-center justify-between h-5">
                                      <FormLabel className="text-xs font-semibold text-muted-foreground">Shipping</FormLabel>
                                  </div>
                                  <FormControl>
                                  <Input type="number" step="0.01" className="h-8 bg-white text-xs" {...field} />
                                  </FormControl>
                              </FormItem>
                              )}
                          />
                      </div>
                  </div>

              </div>

              {/* CENTER - ITEMS TABLE */}
              <div className="flex-1 flex flex-col overflow-hidden bg-muted/5 p-4 relative">
                  <div className="max-w-2xl mb-4 z-10">
                    {/* Pass the selected warehouseId to filter products (same as invoice) */}
                    <ProductSelector onSelectProduct={handleAddProduct} warehouseId={form.watch('warehouse')} />
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
                                            ₱{(Number(form.watch(`items.${index}.price`) || 0) * Number(form.watch(`items.${index}.quantity`) || 0)).toFixed(2)}
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
                                <span>₱{(total - Number(form.watch('shipping') || 0)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Shipping</span>
                                <span>₱{Number(form.watch('shipping') || 0).toFixed(2)}</span>
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

'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { PurchaseOrder, Product, Warehouse } from '@/lib/types';
import { mockSuppliers } from '@/lib/data';
import { getWarehouses } from '../products/actions';
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
import { PlusCircle, Loader2, Trash2, Plus, Search, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ManagePaymentMethodsDialog } from '../sales/ManagePaymentMethodsDialog';
import { ManageWarehousesDialog } from '../sales/ManageWarehousesDialog';
import { useProducts, usePaymentMethods } from '@/hooks/use-api';
import { SupplierFormDialog } from '../products/ManageSuppliersDialog';
import { addSupplier } from '../products/actions';

const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.coerce.number().positive(),
  cost: z.coerce.number().nonnegative(),
  expirationDate: z.string().optional(),
});

const purchaseOrderSchema = z.object({
  purchaseType: z.string().min(1, 'Purchase type is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  deliveryDate: z.string().optional(),
  reference: z.string().optional(),
  supplierId: z.string().min(1, 'Supplier is required'),
  shipping: z.coerce.number().nonnegative().optional(),
  receiveToWarehouse: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  note: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

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
              Search and select a product to add to the purchase order.
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

export function AddPurchaseOrderDialog({ 
  onAddOrder, 
  prefillProduct,
  trigger 
}: { 
  onAddOrder?: (order: PurchaseOrder) => void;
  prefillProduct?: Product; 
  trigger?: React.ReactNode; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  
  const { toast } = useToast();
  const { paymentMethods } = usePaymentMethods();
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    // Fetch suppliers dynamically on mount
    import('../products/actions').then(mod => {
        mod.getSuppliers().then(data => setSuppliers(data));
    });
  }, []);

  // Generate auto reference number
  const generateReference = () => {
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `PO-${randomNum}`;
  };

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      purchaseType: 'Order',
      issueDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      reference: '',
      supplierId: '',
      shipping: 0,
      receiveToWarehouse: '',
      deliveryAddress: '',
      paymentMethod: '',
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
          const cost = item?.cost || 0;
          const quantity = item?.quantity || 0;
          return acc + (cost * quantity);
        }, 0);
        const shippingCost = value.shipping || 0;
        setTotal(itemsTotal + shippingCost);
      }
    });

    // Initial calculation
    const currentValues = form.getValues();
    const itemsTotal = (currentValues.items || []).reduce((acc: number, item: any) => {
      const cost = item?.cost || 0;
      const quantity = item?.quantity || 0;
      return acc + (cost * quantity);
    }, 0);
    const shippingCost = currentValues.shipping || 0;
    setTotal(itemsTotal + shippingCost);

    return () => subscription.unsubscribe();
  }, []);

  // Load warehouses
  const fetchWarehouses = async () => {
    setIsLoadingWarehouses(true);
    try {
      const warehouseData = await getWarehouses();
      setWarehouses(warehouseData);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    } finally {
      setIsLoadingWarehouses(false);
    }
  };


  useEffect(() => {
    if (isOpen) {
      const autoReference = generateReference();
      form.setValue('reference', autoReference);
      fetchWarehouses();

      // Handle prefill if provided and no items yet (to avoid overwriting if user closes/opens)
      // Actually, standard behavior is to reset usually. 
      // If prefillProduct is present, let's add it.
      if (prefillProduct && fields.length === 0) {
           // We might want to set supplier if configured
           // But supplier is on the product? Interface says: supplier?: string (name?)
           // Let's check logic: product.supplier is ID or Name? type says string. Actions.ts says we fetch Suppliers. 
           // Usually it's an ID if it's a relation.
           
           if(prefillProduct.supplier) {
               // Verify it exists in mockSuppliers? Or just set it. 
               // For now let's set it if it matches an ID format or we find it.
               const sup = suppliers.find(s => s.id === prefillProduct.supplier || s.name === prefillProduct.supplier);
               if(sup) form.setValue('supplierId', sup.id);
           }

           handleAddProduct(prefillProduct);
          
           // Maybe set default quantity to reorder point diff?
           // For now 1 is safe or handleAddProduct default.
      }
    }
  }, [isOpen, form, prefillProduct]);

  const handleAddProduct = (product: Product) => {
    const existingItemIndex = fields.findIndex(field => field.productId === product.id);
    if(existingItemIndex !== -1) {
        // Optional: Increment quantity or warn
        // Original logic warned, but Sales logic increments. 
        // Let's stick to Sales logic: Increment
        const existingItem = fields[existingItemIndex];
        update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + 1 });
    } else {
        append({ 
          productId: product.id, 
          productName: product.name, 
          quantity: 1, 
          cost: product.cost || 0, 
          expirationDate: '' 
        });
    }
  };

  async function onSubmit(values: PurchaseOrderFormValues) {
    setIsSubmitting(true);

    try {
      const supplier = suppliers.find(s => s.id === values.supplierId);

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const orderData = {
        supplierId: values.supplierId,
        supplierName: supplier.name,
        date: new Date().toISOString(),
        items: fields.map(field => ({
          productId: field.productId,
          productName: field.productName,
          quantity: field.quantity,
          cost: field.cost,
          expirationDate: field.expirationDate,
        })),
        total,
        paymentMethod: values.paymentMethod,
        status: 'Pending',
        // Pass other fields...
        // ...
      };

      // Save to database
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create purchase order');
      }

      if (onAddOrder) onAddOrder(result.data);

      toast({
        title: 'Purchase Order Added',
        description: `PO from ${supplier.name} has been successfully created.`,
      });

      form.reset();
      setIsOpen(false);
      
      // Optionally refresh
      // window.location.reload(); 
    } catch (error) {
      console.error('Error adding purchase order:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem adding the purchase order. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
            <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Purchase Order
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 gap-0 bg-background">
        <DialogHeader className="px-6 py-4 border-b bg-background">
          <DialogTitle>New Purchase Order</DialogTitle>
          <DialogDescription>
            Create a purchase transaction. Reference: <span className="font-mono font-medium text-primary">{form.watch('reference')}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              {/* LEFT SIDEBAR - DETAILS */}
              <div className="w-[400px] border-r bg-background flex flex-col overflow-y-auto p-5 gap-6">
                
                {/* Section: Supplier & Payment */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"/> Supplier & Details
                  </h3>
                  <div className="space-y-4 pl-3">
                    <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Supplier</FormLabel>
                            <div className="flex gap-2">
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {suppliers.map(sup => <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <SupplierFormDialog 
                                  onSave={async (data) => {
                                      const result = await addSupplier(data);
                                      if (result.success) {
                                          const newSuppliers = await import('../products/actions').then(mod => mod.getSuppliers());
                                          setSuppliers(newSuppliers);
                                      } else {
                                          throw new Error(result.message);
                                      }
                                  }}
                                >
                                    <Button variant="ghost" size="icon" type="button"><Plus className="h-4 w-4"/></Button>
                                </SupplierFormDialog>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
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
                                  {paymentMethods?.map(method => <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <ManagePaymentMethodsDialog trigger={<Button variant="ghost" size="icon" type="button"><Plus className="h-4 w-4"/></Button>} />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="purchaseType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Purchase Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Order">Order</SelectItem>
                                <SelectItem value="Receive">Receive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                </div>

                <hr className="border-border/50"/>

                {/* Section: Order Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full"/> Order Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4 pl-3">
                     <FormField
                        control={form.control}
                        name="issueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Issue Date</FormLabel>
                            <FormControl>
                              <Input type="date" className="bg-white" {...field} />
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
                            <FormLabel className="text-xs">Delivery Date</FormLabel>
                            <FormControl>
                              <Input type="date" className="bg-white" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="receiveToWarehouse"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-xs">Receive To</FormLabel>
                            <div className="flex gap-2">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select warehouse" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {warehouses?.map(warehouse => (
                                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                      {warehouse.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                               <ManageWarehousesDialog
                                  trigger={<Button variant="ghost" size="icon" type="button"><Plus className="h-4 w-4"/></Button>}
                                  onChange={fetchWarehouses}
                                />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                          control={form.control}
                          name="reference"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
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
                    <span className="w-1 h-4 bg-primary rounded-full"/> Shipping
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
                   </div>
                </div>

              </div>
              
              {/* RIGHT MAIN - ITEMS */}
              <div className="flex-1 flex flex-col bg-muted/5 p-6 overflow-hidden">
                <div className="mb-4">
                  <ProductSelector onSelectProduct={handleAddProduct} />
                </div>

                <div className="flex-1 rounded-lg border bg-background shadow-sm overflow-hidden flex flex-col">
                   <div className="overflow-y-auto flex-1 relative">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/50 z-10 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className='w-[35%] pl-4'>Product</TableHead>
                          <TableHead className='w-[10%] text-center'>Qty</TableHead>
                          <TableHead className='w-[15%] text-right'>Cost</TableHead>
                          <TableHead className='w-[15%] text-left'>Expiry</TableHead>
                          <TableHead className='w-[15%] text-right pr-4'>Total</TableHead>
                          <TableHead className='w-[5%]'></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-[300px] text-center text-muted-foreground flex flex-col items-center justify-center border-none">
                                    <Search className="h-10 w-10 mb-2 opacity-20"/>
                                    <p>No items added.</p>
                                    <p className="text-xs">Scan or search products to begin.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            fields.map((field, index) => (
                          <TableRow key={field.id} className="group bg-white">
                            <TableCell className="font-medium pl-4 py-2">
                                <div className="text-sm font-semibold">{field.productName}</div>
                                <div className="text-xs text-muted-foreground">
                                    {/* Could add SKU detail if available in field object, but only name is stored in form array currently. can persist more info if needed */}
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
                                name={`items.${index}.cost`}
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
                            <TableCell className="py-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.expirationDate`}
                                render={({ field }) => (
                                  <Input 
                                    type="date" 
                                    className="h-8 w-32 border-transparent hover:border-input focus:border-input bg-white text-xs" 
                                    {...field} 
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-right py-2 pr-4 font-mono">
                              ₱{(form.watch(`items.${index}.cost`) * form.watch(`items.${index}.quantity`)).toFixed(2)}
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
                                  value={field.value || ''}
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
                  <>Create Order <ArrowRight className="ml-2 h-4 w-4"/></>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { PurchaseOrder, Product, Warehouse, TaxRate } from '@/lib/types';
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
import * as DialogPrimitive from '@radix-ui/react-dialog';
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
import { PlusCircle, Loader2, Trash2, Plus, Search, ArrowRight, Wand2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ManagePaymentMethodsDialog } from '../sales/ManagePaymentMethodsDialog';
import { ManageWarehousesDialog } from '../sales/ManageWarehousesDialog';
import { useProducts, usePaymentMethods } from '@/hooks/use-api';
import { SupplierFormDialog } from '../products/ManageSuppliersDialog';
import { addSupplier } from '../products/actions';
import { useUser } from '@/hooks/use-user';

const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.coerce.number().positive(),
  cost: z.coerce.number().nonnegative(),
  sellingPrice: z.coerce.number().nonnegative().optional(),
  discount: z.coerce.number().nonnegative().optional(),
  discountType: z.enum(['amount', 'percentage']).optional(),
  vatSubject: z.boolean().optional(),
  barcode: z.string().optional(),
  currentStock: z.coerce.number().optional(),
  avgDailySales: z.coerce.number().optional(),
  reorderPoint: z.coerce.number().optional(),
  expirationDate: z.string().optional(),
});

const purchaseOrderSchema = z.object({
  purchaseType: z.string().min(1, 'Purchase type is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  deliveryDate: z.string().optional(),
  reference: z.string().optional(),
  supplierId: z.string().min(1, 'Supplier is required'),
  shipping: z.coerce.number().nonnegative().optional(),
  receiveToWarehouse: z.string().min(1, 'Reception warehouse is required'),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  note: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

function ProductSelector({ onSelectProduct, supplierId }: { onSelectProduct: (product: Product) => void, supplierId?: string }) {
  const { products, loading, error } = useProducts(undefined, undefined, supplierId);
  const [inputValue, setInputValue] = useState('');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  const handleScanOrPunch = () => {
    const term = inputValue.trim();
    if (!term) return;

    // 1. Exact match on Barcode or SKU (High priority)
    const exactMatch = products.find(p =>
      p.barcode?.toLowerCase() === term.toLowerCase() ||
      p.sku?.toLowerCase() === term.toLowerCase()
    );

    if (exactMatch) {
      onSelectProduct(exactMatch);
      setInputValue('');
      return;
    }

    // 2. Exact match on Name
    const nameMatch = products.find(p => p.name.toLowerCase() === term.toLowerCase());
    if (nameMatch) {
      onSelectProduct(nameMatch);
      setInputValue('');
      return;
    }

    // 3. Partial match on Name
    const partialMatches = products.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));

    if (partialMatches.length === 1) {
      onSelectProduct(partialMatches[0]);
      setInputValue('');
    } else {
      // 0 or Multiple matches -> Open dialog to let user choose
      setCommandSearch(term);
      setSearchDialogOpen(true);
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

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} modal={false}>
        <DraggableSearchDialogContent className="sm:max-w-md" onClose={() => setSearchDialogOpen(false)}>
          <div data-drag-handle className="cursor-move">
            <DialogHeader>
              <DialogTitle>Search Products</DialogTitle>
              <DialogDescription>
                Search and select a product to add to the purchase order.
              </DialogDescription>
            </DialogHeader>
          </div>
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
              <CommandInput 
                placeholder="Type product name, SKU, or barcode..." 
                value={commandSearch}
                onValueChange={setCommandSearch}
              />
              <CommandList>
                <CommandEmpty>No products found.</CommandEmpty>
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.sku || ''} ${product.barcode || ''}`}
                      onSelect={() => {
                        onSelectProduct(product);
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
        </DraggableSearchDialogContent>
      </Dialog>
    </>
  );
}

// Helper component defined outside
function DraggableSearchDialogContent({ 
  className, 
  children, 
  onClose,
  ...props 
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { onClose?: () => void }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      elementStartPos.current = { ...position };
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      setPosition({
        x: elementStartPos.current.x + dx,
        y: elementStartPos.current.y + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Content
        {...props}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
        style={{
           position: 'fixed',
           left: '50%',
           top: '20%',
           transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
           // Ensure it has high z-index to be above other dialogs
           zIndex: 200, 
        }}
        className={`bg-background p-6 shadow-lg rounded-xl border w-full max-w-lg ${className}`}
      >
        {children}
        <DialogPrimitive.Close 
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}





export function AddPurchaseOrderDialog({ 
  onAddOrder, 
  prefillProduct,
  prefillSupplierId,
  editOrder,
  reorderData,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: { 
  onAddOrder?: (order: PurchaseOrder) => void;
  prefillProduct?: Product; 
  prefillSupplierId?: string;
  editOrder?: PurchaseOrder | null;
  reorderData?: PurchaseOrder | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  
  const { toast } = useToast();
  const { paymentMethods } = usePaymentMethods();
  const { products } = useProducts();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const { user } = useUser();

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
  const [vatTotal, setVatTotal] = useState(0);

  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [activeTaxRate, setActiveTaxRate] = useState<TaxRate | null>(null);

  useEffect(() => {
    // Fetch tax rates
    fetch('/api/settings/tax-rates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTaxRates(data);
          const defaultRate = data.find(r => r.isDefault);
          if (defaultRate) setActiveTaxRate(defaultRate);
          else if (data.length > 0) setActiveTaxRate(data[0]);
        }
      })
      .catch(err => console.error('Failed to fetch tax rates', err));
  }, []);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items') || name === 'shipping') {
         calculateTotal(value.items || [], value.shipping);
      }
    });

    const currentValues = form.getValues();
    calculateTotal(currentValues.items, currentValues.shipping);

    return () => subscription.unsubscribe();
  }, [activeTaxRate]); 

  const calculateTotal = (items: any[], shipping?: number) => {
    const taxRate = activeTaxRate ? Number(activeTaxRate.rate) : 0;
    
    let subtotal = 0;
    let vatAmount = 0;

    (items || []).forEach((item: any) => {
          const cost = item?.cost || 0;
          const quantity = item?.quantity || 0;
          const discount = item?.discount || 0;
          const discountType = item?.discountType || 'amount';
          const isVatSubject = item?.vatSubject || false;
          
          let itemTotal = cost * quantity;
          if (discountType === 'percentage') {
             itemTotal = itemTotal - (itemTotal * (discount / 100));
          } else {
             itemTotal = itemTotal - discount;
          }
          
          subtotal += itemTotal;

          if (isVatSubject) {
             // Inclusive VAT calculation: Total * (Rate / (100 + Rate))
             vatAmount += itemTotal * (taxRate / (100 + taxRate));
          }
    });
    
    const shippingCost = shipping || 0;
    setVatTotal(vatAmount);
    // VAT is "Included" so we don't add it to the total (Price is Gross)
    setTotal(subtotal + shippingCost);
  };

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
      fetchWarehouses();

      if (editOrder) {
          // Prefill existing order data
          form.reset({
              purchaseType: 'Order', 
              issueDate: editOrder.date ? new Date(editOrder.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              deliveryDate: editOrder.deliveryDate ? new Date(editOrder.deliveryDate).toISOString().split('T')[0] : '',
              reference: editOrder.referenceNumber || '',
              supplierId: editOrder.supplierId,
              shipping: editOrder.shippingFee || 0,
              receiveToWarehouse: '',
              deliveryAddress: '',
              paymentMethod: editOrder.paymentMethod,
              note: '', 
              items: editOrder.items.map(item => {
                  const currentProduct = products.find(p => p.id === item.productId);
                  return {
                      productId: item.productId,
                      productName: item.productName,
                      quantity: item.quantity,
                      cost: item.cost,
                      sellingPrice: 0,
                      discount: item.discount || 0,
                      discountType: 'amount',
                      vatSubject: false,
                      expirationDate: '',
                      currentStock: currentProduct ? currentProduct.stock : 0,
                      barcode: currentProduct ? currentProduct.barcode : '',
                  };
              }),
          });
      } else if (reorderData) {
          // Prefill for REORDER - Creates new order based on old one
          const autoReference = generateReference();
          
          // Map items and update with latest stock info if available
          const updatedItems = reorderData.items.map(item => {
              const currentProduct = products.find(p => p.id === item.productId);
              return {
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  cost: item.cost, // Keep original cost for now, unless user wants latest cost
                  sellingPrice: currentProduct ? currentProduct.price : 0,
                  discount: item.discount || 0,
                  discountType: (item.discountType as 'amount' | 'percentage') || 'amount',
                  vatSubject: false,
                  expirationDate: '',
                  // CRITICAL: Update stock to current level
                  currentStock: currentProduct ? currentProduct.stock : 0, 
                  barcode: currentProduct ? currentProduct.barcode : '',
              };
          });

          form.reset({
              purchaseType: 'Order', 
              issueDate: new Date().toISOString().split('T')[0], // Today
              deliveryDate: '', // Clear delivery date
              reference: autoReference, // New reference
              supplierId: reorderData.supplierId,
              shipping: reorderData.shippingFee || 0,
              receiveToWarehouse: '',
              deliveryAddress: '',
              paymentMethod: reorderData.paymentMethod,
              note: '', 
              items: updatedItems,
          });
      } else {
        const autoReference = generateReference();
        form.setValue('reference', autoReference);

        if (prefillSupplierId) {
             // We rely on suppliers being loaded or we might need to wait, but usually they load fast.
             // We can try to set it, and if suppliers update, maybe we need to ensure it's valid?
             // Actually, since we use Select, setting the value is enough if the option exists.
             if(suppliers.length > 0) {
                 const sup = suppliers.find(s => s.id === prefillSupplierId);
                 if(sup) form.setValue('supplierId', sup.id);
             } else {
                 // If not loaded yet, we can set it and hope the Select renders correctly once suppliers load.
                 form.setValue('supplierId', prefillSupplierId);
             }
        }

        if (prefillProduct && fields.length === 0) {
           if(prefillProduct.supplier) {
               const sup = suppliers.find(s => s.id === prefillProduct.supplier || s.name === prefillProduct.supplier);
               if(sup) form.setValue('supplierId', sup.id);
           }
           handleAddProduct(prefillProduct);
        }
      }
    }
  }, [isOpen, editOrder, reorderData, prefillProduct, prefillSupplierId, suppliers, products]); // Added prefillSupplierId and suppliers to dependency

  function handleAddProduct(product: Product) {
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
          sellingPrice: product.price || 0,
          discount: 0,
          discountType: 'amount',
          vatSubject: product.vatStatus === 'Vatable' || product.vatStatus === 'Yes' || false, // Initialize based on product default if available
          barcode: product.barcode || '',
          currentStock: product.stock || 0,
          avgDailySales: product.avgDailySales || 0,
          reorderPoint: product.reorderPoint || 0,
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

      const taxRate = activeTaxRate ? Number(activeTaxRate.rate) : 0;
      let calculatedVatAmount = 0;
      
      const items = (values.items || []).map((item: any) => {
          const cost = item.cost;
          const quantity = item.quantity;
          const discount = item.discount || 0;
          const discountType = item.discountType;
          let itemTotal = cost * quantity;
          if (discountType === 'percentage') {
             itemTotal = itemTotal - (itemTotal * (discount / 100));
          } else {
             itemTotal = itemTotal - discount;
          }

          if (item.vatSubject) {
              // Inclusive VAT calculation
              calculatedVatAmount += itemTotal * (taxRate / (100 + taxRate));
          }

          return {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          cost: item.cost,
          sellingPrice: item.sellingPrice,
          discount: item.discount,
          discountType: item.discountType,
          vatSubject: item.vatSubject,
          expirationDate: item.expirationDate,
          barcode: item.barcode,
          currentStock: item.currentStock,
        }
      });

      const orderData = {
        supplierId: values.supplierId,
        supplierName: supplier.name,
        date: new Date(values.issueDate).toISOString(), // Use form date
        items: items,
        total: total, // Check if total here matches our state total (inc VAT)
        vatAmount: calculatedVatAmount,
        paymentMethod: values.paymentMethod,
        status: editOrder ? undefined : 'Pending', // Don't reset status on edit
        reference: values.reference,
        shipping: values.shipping,
        note: values.note,
        purchaseType: values.purchaseType,
        receiveToWarehouse: values.receiveToWarehouse,
        orderedBy: editOrder ? editOrder.orderedBy : (user?.email || 'System'),
        deliveryDate: values.deliveryDate ? new Date(values.deliveryDate).toISOString() : null,
      };

      let result;
      if (editOrder) {
          // Update
          const response = await fetch(`/api/purchase-orders/${editOrder.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData),
          });
          result = await response.json();
      } else {
          // Create
          const response = await fetch('/api/purchase-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData),
          });
          result = await response.json();
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save purchase order');
      }

      if (onAddOrder) onAddOrder(result.data);

      toast({
        title: editOrder ? 'Purchase Order Updated' : 'Purchase Order Added',
        description: `PO ${values.reference} has been successfully saved.`,
      });

      if (!editOrder) form.reset();
      setOpen(false);
      
      // Optionally refresh
      // window.location.reload(); 
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem saving the purchase order. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
        setOpen(val);
        if(!val) {
             // Reset logic if needed or clear edit state in parent?
             // Parent handles editOrder clearing via its own state usually.
             // If we close, we should form.reset() if not editing?
        }
    }}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
            <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Purchase Order
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[100vw] w-full h-screen max-h-screen flex flex-col p-0 gap-0 bg-background border-none rounded-none">
        <DialogHeader className="px-6 py-4 border-b bg-background">
          <DialogTitle>{editOrder ? 'Edit' : 'New'} Purchase Order</DialogTitle>
          <DialogDescription>
            Create a purchase transaction. Reference: <span className="font-mono font-medium text-primary">{form.watch('reference')}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden bg-muted/10">
              
              {/* TOP HEADER - Form Fields (Compact Grid) */}
              <div className="bg-background border-b p-4 grid grid-cols-4 gap-4 shrink-0">
                  
                  {/* Column 1: Supplier & Type */}
                  <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Supplier</FormLabel>
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
                                        <span className="text-xs text-primary cursor-pointer hover:underline">Manage</span>
                                    </SupplierFormDialog>
                                </div>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                    <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {suppliers.map(sup => <SelectItem key={sup.id} value={sup.id} className="text-xs">{sup.name}</SelectItem>)}
                                </SelectContent>

                                </Select>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                            control={form.control}
                            name="purchaseType"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Type</FormLabel>
                                </div>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                    <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Order" className="text-xs">Order</SelectItem>
                                    <SelectItem value="Receive" className="text-xs">Receive</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage className="text-xs" />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="reference"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Ref #</FormLabel>
                                </div>
                                <FormControl>
                                <Input className="h-8 bg-white text-xs" {...field} />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                      </div>
                  </div>

                  {/* Column 2: Dates & Warehouse */}
                  <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                            control={form.control}
                            name="issueDate"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Issue Date</FormLabel>
                                </div>
                                <FormControl>
                                <Input type="date" className="h-8 bg-white text-xs" {...field} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="deliveryDate"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Due Date</FormLabel>
                                </div>
                                <FormControl>
                                <Input type="date" className="h-8 bg-white text-xs" {...field} />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                      </div>
                       <FormField
                            control={form.control}
                            name="receiveToWarehouse"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Receive To</FormLabel>
                                    <ManageWarehousesDialog
                                        trigger={
                                            <span className="text-xs text-primary cursor-pointer hover:underline">Manage</span>
                                        }
                                        onChange={fetchWarehouses}
                                    />
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
                                <FormMessage className="text-xs" />
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
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Payment Method</FormLabel>
                                    <ManagePaymentMethodsDialog 
                                        trigger={
                                            <span className="text-xs text-primary cursor-pointer hover:underline">Manage</span>
                                        } 
                                    />
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
                                <FormMessage className="text-xs" />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="shipping"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Shipping Cost</FormLabel>
                                </div>
                                <FormControl>
                                <Input type="number" step="0.01" className="h-8 bg-white text-xs" {...field} />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                  </div>

                  {/* Column 4: Address / Notes */}
                  <div className="space-y-3">
                      <FormField
                            control={form.control}
                            name="deliveryAddress"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Address</FormLabel>
                                </div>
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
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-semibold text-muted-foreground">Notes</FormLabel>
                                </div>
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
                    <ProductSelector 
                        onSelectProduct={handleAddProduct} 
                        supplierId={form.watch('supplierId')}
                    />
                  </div>
                  
                  <div className="flex-1 rounded-lg border bg-background shadow-sm overflow-hidden flex flex-col relative">
                      <div className="overflow-y-auto flex-1 h-full relative">
                        <table className="w-full caption-bottom text-sm text-left border-collapse">
                        <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                            <TableRow className="hover:bg-transparent border-b">
                            <TableHead className='w-[15%] pl-4 h-10'>Product</TableHead>
                            <TableHead className='w-[10%] text-center h-10'>Remaining QTY</TableHead>
                            <TableHead className='w-[8%] text-center h-10'>Qty</TableHead>
                            <TableHead className='w-[10%] text-right h-10'>Cost</TableHead>
                            <TableHead className='w-[10%] text-right h-10'>Sell Price</TableHead>
                            <TableHead className='w-[10%] text-center h-10'>Discount</TableHead>
                            <TableHead className='w-[5%] text-center h-10'>VAT</TableHead>
                            <TableHead className='w-[12%] text-left h-10'>Expiry</TableHead>
                            <TableHead className='w-[15%] text-right pr-4 h-10'>Total</TableHead>
                            <TableHead className='w-[5%] h-10'></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-[300px] text-center text-muted-foreground flex flex-col items-center justify-center border-none">
                                        <div className="bg-muted p-4 rounded-full mb-4"><Search className="h-8 w-8 opacity-20"/></div>
                                        <p className="font-medium">No items added</p>
                                        <p className="text-xs text-muted-foreground">Scan barcode or search above to add products.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                fields.map((field, index) => (
                            <TableRow key={field.id} className="group bg-white hover:bg-muted/5">
                                <TableCell className="font-medium pl-4 py-2 border-r">
                                    <div className="text-sm font-semibold">{field.productName}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span className="font-mono">{field.barcode || '-'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 text-center border-r font-mono text-xs">
                                     <span className={(field.currentStock || 0) <= 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                                        {field.currentStock || 0}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2 border-r">

                                <div className="flex justify-center flex-col items-center">
                                    <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                        <>
                                        <Input 
                                        type="number" 
                                        className="h-8 w-20 text-center bg-white" 
                                        {...field} 
                                        onFocus={(e) => e.target.select()}
                                        />
                                        {/* Quantity Suggestion */}
                                        </>
                                    )}
                                    />
                                </div>
                                </TableCell>
                                <TableCell className="py-2 text-right border-r">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.cost`}
                                    render={({ field }) => (
                                    <CurrencyInput 
                                        className="h-8 w-24 text-right ml-auto border-transparent hover:border-input focus:border-input bg-white p-1 font-mono text-xs" 
                                        placeholder="0.00"
                                        {...field} 
                                    />
                                    )}
                                />
                                </TableCell>
                                <TableCell className="py-2 text-right border-r">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.sellingPrice`}
                                    render={({ field }) => (
                                    <CurrencyInput 
                                        className="h-8 w-24 text-right ml-auto border-transparent hover:border-input focus:border-input bg-white p-1 font-mono text-xs" 
                                        placeholder="0.00"
                                        {...field} 
                                    />
                                    )}
                                />
                                </TableCell>
                                <TableCell className="py-2 text-right border-r">
                                <div className="flex items-center gap-1 justify-center">
                                    <FormField
                                    control={form.control}
                                    name={`items.${index}.discountType`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-0 text-center">
                                        <Select 
                                            onValueChange={field.onChange} 
                                            defaultValue={field.value || 'amount'}
                                        >
                                            <FormControl> 
                                            <SelectTrigger className="h-8 w-[40px] px-1 text-xs bg-white border-transparent hover:border-input focus:border-input">
                                                <SelectValue />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            <SelectItem value="amount">₱</SelectItem>
                                            <SelectItem value="percentage">%</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        </FormItem>
                                    )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name={`items.${index}.discount`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-0">
                                        <FormControl>
                                            <Input 
                                            type="number" 
                                            step="0.01" 
                                            className="h-8 w-16 text-right border-transparent hover:border-input focus:border-input bg-white p-1 text-xs" 
                                            {...field} 
                                            />
                                        </FormControl>
                                        </FormItem>
                                    )}
                                    />
                                </div>
                                </TableCell>
                                <TableCell className="py-2 text-center border-r">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.vatSubject`}
                                    render={({ field }) => (
                                    <div className="flex justify-center">
                                        <input 
                                            type="checkbox" 
                                            className="h-4 w-4" 
                                            checked={field.value} 
                                            onChange={field.onChange}
                                        />
                                    </div>
                                    )}
                                />
                                </TableCell>
                                <TableCell className="py-2 border-r">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.expirationDate`}
                                    render={({ field }) => (
                                    <Input 
                                        type="date" 
                                        className="h-8 w-full border-transparent hover:border-input focus:border-input bg-white text-xs p-1" 
                                        {...field} 
                                    />
                                    )}
                                />
                                </TableCell>
                                <TableCell className="text-right py-2 pr-4 font-mono font-medium">
                                    {(() => {
                                        const cost = form.watch(`items.${index}.cost`) || 0;
                                        const qty = form.watch(`items.${index}.quantity`) || 0;
                                        const disc = form.watch(`items.${index}.discount`) || 0;
                                        const type = form.watch(`items.${index}.discountType`) || 'amount';
                                        let total = cost * qty;
                                        if(type === 'percentage') {
                                            total = total - (total * (disc / 100));
                                        } else {
                                            total = total - disc;
                                        }
                                        return `₱${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                                    })()}
                                </TableCell>
                                <TableCell className="py-2 flex items-center justify-end gap-1">
                                    {/* Wand Icon (Auto-fill quantity) */}
                                    {(() => {
                                            const rop = fields[index].reorderPoint || 0;
                                            // User requested to base suggestion on Reorder Point directly (treating it as order qty)
                                            const suggested = rop; 
                                            const hasRop = rop > 0;
                                            
                                            return (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 transition-colors ${hasRop ? 'text-primary hover:text-primary/80' : 'text-muted-foreground/30 hover:text-muted-foreground'}`}
                                                    title={hasRop ? `Suggest Order Qty: ${suggested}` : "No Reorder Point set"}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        
                                                        if (!hasRop || suggested <= 0) {
                                                            toast({
                                                                title: "No Suggestion Available",
                                                                description: "Please set a Reorder Point for this product in settings to use auto-fill.",
                                                                variant: "destructive"
                                                            });
                                                            return;
                                                        }

                                                        form.setValue(`items.${index}.quantity`, suggested, { 
                                                            shouldValidate: true, 
                                                            shouldDirty: true, 
                                                            shouldTouch: true 
                                                        });
                                                        toast({
                                                            title: "Quantity Updated",
                                                            description: `Set quantity to ${suggested} (based on Reorder Point).`,
                                                        });
                                                    }}
                                                >
                                                    <Wand2 className="h-4 w-4" />
                                                </Button>
                                            );
                                    })()}
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
                  </div>
              </div>


              {/* BOTTOM SUMMARY BAR */}
              <div className="bg-background border-t p-3 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <div className="text-xs text-muted-foreground">
                        <span className="font-semibold">{fields.length}</span> items added.
                    </div>
                    
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Subtotal</span>
                            <span className="font-mono text-sm">₱{(total - (form.watch('shipping') || 0)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Shipping</span>
                            <span className="font-mono text-sm">₱{(form.watch('shipping') || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">VAT {activeTaxRate ? `(${activeTaxRate.rate}%)` : ''}</span>
                            <span className="font-mono text-sm">₱{vatTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                         <div className="flex flex-col items-end border-l pl-8">
                            <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Total Payable</span>
                            <span className="font-mono text-2xl font-bold text-primary">₱{total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
              </div>

            </div>

            <DialogFooter className="p-4 bg-background border-t">
               <div className="flex items-center text-xs text-muted-foreground mr-auto">
                 <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Ready to process</span>
               </div>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || fields.length === 0} className="w-40 font-semibold shadow-lg shadow-primary/20">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {editOrder ? 'Update Order' : 'Create Order'} 
                    <ArrowRight className="ml-2 h-4 w-4"/>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CurrencyInput({ value, onChange, className, ...props }: any) {
  const [isFocused, setIsFocused] = useState(false);

  const format = (val: any) => {
    if (val === '' || val === undefined || val === null) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Input
      type="text"
      className={className}
      value={isFocused ? value : format(value)}
      onChange={(e) => {
        // Allow digits and one dot
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        // Prevent multiple dots
        if ((raw.match(/\./g) || []).length > 1) return;
        onChange(raw);
      }}
      onFocus={(e) => {
        setIsFocused(true);
        e.target.select();
      }}
      onBlur={() => setIsFocused(false)}
      {...props}
    />
  );
}

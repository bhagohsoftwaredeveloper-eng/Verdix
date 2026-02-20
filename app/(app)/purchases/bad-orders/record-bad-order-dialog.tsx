'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, X, Search, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/use-api';
import { useUser } from '@/hooks/use-user';
import { Product } from '@/lib/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RecordBadOrderDialogProps {
  onSuccess: () => void;
}

const badOrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.coerce.number().positive(),
  cost: z.coerce.number().nonnegative(),
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().optional().default(''),
  barcode: z.string().optional(),
  currentStock: z.coerce.number().optional(),
});

const badOrderSchema = z.object({
  reportedBy: z.string().min(1, 'Reported by is required'),
  notes: z.string().optional(),
  items: z.array(badOrderItemSchema).min(1, 'At least one item is required'),
});

type BadOrderFormValues = z.infer<typeof badOrderSchema>;

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

function ProductSelector({ onSelectProduct }: { onSelectProduct: (product: Product) => void }) {
  const { products, loading, error } = useProducts();
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
                Search and select a product to report.
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
        </DraggableSearchDialogContent>
      </Dialog>
    </>
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
        const raw = e.target.value.replace(/[^0-9.]/g, '');
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

export function RecordBadOrderDialog({ onSuccess }: RecordBadOrderDialogProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<BadOrderFormValues>({
    resolver: zodResolver(badOrderSchema),
    defaultValues: {
      reportedBy: '',
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (open && user?.email && !form.getValues('reportedBy')) {
      form.setValue('reportedBy', user.email);
    }
  }, [open, user, form]);

  const [total, setTotal] = useState(0);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items')) {
         calculateTotal(value.items || []);
      }
    });

    const currentValues = form.getValues();
    calculateTotal(currentValues.items || []);

    return () => subscription.unsubscribe();
  }, [form.watch]);

  const calculateTotal = (items: any[]) => {
    let subtotal = 0;
    (items || []).forEach((item: any) => {
      const cost = parseFloat(item?.cost) || 0;
      const quantity = parseFloat(item?.quantity) || 0;
      subtotal += (cost * quantity);
    });
    setTotal(subtotal);
  };

  function handleAddProduct(product: Product) {
    const existingItemIndex = fields.findIndex(field => field.productId === product.id);
    if(existingItemIndex !== -1) {
        const existingItem = fields[existingItemIndex];
        update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + 1 });
    } else {
        append({ 
          productId: product.id, 
          productName: product.name, 
          quantity: 1, 
          cost: product.cost || 0,
          reason: 'Damaged',
          description: '',
          barcode: product.barcode || '',
          currentStock: product.stock || 0,
        });
    }
  };

  async function onSubmit(values: BadOrderFormValues) {
    setIsSubmitting(true);

    try {
      const formattedItems = values.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        cost: item.cost,
        reason: item.reason,
        description: item.description,
      }));

      const response = await fetch('/api/bad-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchaseOrderId: null,
          supplierId: null,
          supplierName: null,
          reportedBy: values.reportedBy,
          reportDate: new Date().toISOString(),
          items: formattedItems,
          notes: values.notes,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create bad order');
      }

      toast({
        title: 'Bad Order Recorded',
        description: 'The bad order has been recorded successfully.',
      });

      form.reset();
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to create bad order:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record bad order.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if(!val) form.reset();
    }}>
      <DialogTrigger asChild>
        <Button>
          <AlertTriangle className="mr-2 h-4 w-4" />
          Record Bad Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[100vw] w-full h-screen max-h-screen flex flex-col p-0 gap-0 bg-background border-none rounded-none">
        <DialogHeader className="px-6 py-4 border-b bg-background">
          <DialogTitle>Record Bad Order</DialogTitle>
          <DialogDescription>
            Record defective, damaged, or expired items to remove them from inventory properly.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden bg-muted/10">
              
              {/* TOP HEADER */}
              <div className="bg-background border-b p-4 grid grid-cols-4 gap-4 shrink-0">
                  <div className="col-span-1 space-y-3">
                      <FormField
                          control={form.control}
                          name="reportedBy"
                          render={({ field }) => (
                          <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold text-muted-foreground">Reported By</FormLabel>
                              <FormControl>
                                <Input className="h-8 bg-white text-xs" placeholder="Jane Doe" {...field} />
                              </FormControl>
                              <FormMessage className="text-xs" />
                          </FormItem>
                          )}
                      />
                  </div>
                  <div className="col-span-3 flex items-center justify-end pr-4 text-muted-foreground text-sm">
                      <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-md flex items-center gap-2 border border-amber-200">
                          <AlertTriangle className="h-4 w-4" />
                          Items recorded here will be deducted from active inventory.
                      </div>
                  </div>
              </div>

              {/* CENTER - ITEMS TABLE */}
              <div className="flex-1 flex flex-col overflow-hidden bg-muted/5 p-4 relative">
                  <div className="max-w-2xl mb-4 z-10">
                    <ProductSelector 
                        onSelectProduct={handleAddProduct} 
                    />
                  </div>
                  
                  <div className="flex-1 rounded-lg border bg-background shadow-sm overflow-hidden flex flex-col relative">
                      <div className="overflow-y-auto flex-1 h-full relative">
                        <table className="w-full caption-bottom text-sm text-left border-collapse">
                        <TableHeader className="sticky top-0 bg-white z-50 shadow-sm">
                            <TableRow className="hover:bg-transparent border-b">
                            <TableHead className='w-[20%] pl-4 h-10'>Product</TableHead>
                            <TableHead className='w-[8%] text-center h-10'>Stock</TableHead>
                            <TableHead className='w-[15%] text-left h-10'>Reason</TableHead>
                            <TableHead className='w-[12%] text-center h-10'>Qty</TableHead>
                            <TableHead className='w-[12%] text-right h-10'>Cost</TableHead>
                            <TableHead className='w-[15%] text-left h-10'>Description</TableHead>
                            <TableHead className='w-[13%] text-right pr-4 h-10'>Total</TableHead>
                            <TableHead className='w-[5%] h-10'></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-full text-center text-muted-foreground border-none w-full py-[150px]">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="bg-muted p-4 rounded-full mb-4"><Search className="h-8 w-8 opacity-20"/></div>
                                            <p className="font-medium">No items added</p>
                                            <p className="text-xs text-muted-foreground">Search or scan products to record.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                fields.map((field, index) => (
                            <TableRow key={field.id} className="group bg-white hover:bg-muted/5">
                                <TableCell className="font-medium pl-4 py-2 border-r">
                                    <div className="text-sm font-semibold line-clamp-2" title={field.productName}>{field.productName}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span className="font-mono">{field.barcode || '-'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 text-center border-r font-mono text-xs">
                                     <span className={(field.currentStock || 0) <= 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                                        {field.currentStock || 0}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2 border-r px-2 text-center">
                                    <FormField
                                    control={form.control}
                                    name={`items.${index}.reason`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-0">
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-8 text-xs bg-white border-transparent hover:border-input focus:border-input">
                                                        <SelectValue placeholder="Reason" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Damaged">Damaged</SelectItem>
                                                    <SelectItem value="Defective">Defective</SelectItem>
                                                    <SelectItem value="Expired">Expired</SelectItem>
                                                    <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                                                    <SelectItem value="Missing">Missing</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                    />
                                </TableCell>
                                <TableCell className="py-2 border-r">
                                  <div className="flex justify-center flex-col items-center">
                                      <FormField
                                      control={form.control}
                                      name={`items.${index}.quantity`}
                                      render={({ field }) => (
                                          <FormItem className="space-y-0 w-full max-w-[80px]">
                                            <FormControl>
                                              <Input 
                                              type="number" 
                                              className="h-8 w-full text-center bg-white border-transparent hover:border-input focus:border-input text-xs" 
                                              {...field} 
                                              onFocus={(e) => e.target.select()}
                                              />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                          </FormItem>
                                      )}
                                      />
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 text-right border-r px-2">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.cost`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <CurrencyInput 
                                              className="h-8 w-full max-w-[100px] text-right ml-auto border-transparent hover:border-input focus:border-input bg-white p-1 font-mono text-xs" 
                                              placeholder="0.00"
                                              {...field} 
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                />
                                </TableCell>
                                <TableCell className="py-2 text-left border-r px-2">
                                  <FormField
                                      control={form.control}
                                      name={`items.${index}.description`}
                                      render={({ field }) => (
                                          <FormItem className="space-y-0">
                                            <FormControl>
                                              <Input 
                                                  className="h-8 w-full border-transparent hover:border-input focus:border-input bg-white p-1 text-xs" 
                                                  placeholder="Notes..."
                                                  {...field} 
                                              />
                                            </FormControl>
                                          </FormItem>
                                      )}
                                  />
                                </TableCell>
                                <TableCell className="text-right py-2 pr-4 font-mono font-medium">
                                    {(() => {
                                        const cost = parseFloat(form.watch(`items.${index}.cost`) as any) || 0;
                                        const qty = parseFloat(form.watch(`items.${index}.quantity`) as any) || 0;
                                        const total = cost * qty;
                                        return `₱${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                                    })()}
                                </TableCell>
                                <TableCell className="py-2 flex items-center justify-end gap-1">
                                  <Button 
                                      type="button"
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" 
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


              {/* BOTTOM SUMMARY & NOTES */}
              <div className="bg-background border-t p-4 flex gap-6 shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div className="flex-[2] space-y-2">
                      <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                              <FormItem className="space-y-1">
                                  <FormLabel className="text-xs font-semibold text-muted-foreground">General Notes</FormLabel>
                                  <FormControl>
                                      <Textarea 
                                          placeholder="Additional details about this bad order report..." 
                                          className="h-20 resize-none text-xs" 
                                          {...field} 
                                      />
                                  </FormControl>
                              </FormItem>
                          )}
                      />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-end items-end pb-2">
                      <div className="text-xs text-muted-foreground mb-4">
                          <span className="font-semibold">{fields.length}</span> items added
                      </div>
                      <div className="flex flex-col items-end border-l pl-8 border-destructive/20">
                          <span className="text-[10px] uppercase tracking-wider text-destructive font-bold">Total Lost Value</span>
                          <span className="font-mono text-3xl font-bold text-destructive">₱{total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
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
              <Button type="submit" variant="destructive" disabled={isSubmitting || fields.length === 0} className="w-48 font-semibold shadow-lg shadow-destructive/20">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4"/>
                    Record Bad Order
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

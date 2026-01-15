
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  addDocumentNonBlocking,
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, runTransaction } from 'firebase/firestore';
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
import { PlusCircle, Loader2, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Product, Supplier, PurchaseOrder, StockAdjustment, PaymentMethod } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent } from '@/components/ui/card';
import { ManagePaymentMethodsDialog } from '../sales/ManagePaymentMethodsDialog';


const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.coerce.number().positive(),
  cost: z.coerce.number().nonnegative(),
});

const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  status: z.string().min(1, 'Status is required'),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

function ProductSelector({ onSelectProduct }: { onSelectProduct: (product: Product) => void }) {
  const firestore = useFirestore();
  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: products } = useCollection<Product>(productsCollection);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products..." />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {products?.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onSelectProduct(product);
                    setOpen(false);
                  }}
                >
                  {product.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


export function AddPurchaseOrderDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const suppliersCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'suppliers') : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersCollection);

  const paymentMethodsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'paymentMethods') : null), [firestore]);
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useCollection<PaymentMethod>(paymentMethodsCollection);

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: '',
      paymentMethod: '',
      status: 'Pending',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const total = useMemo(() => {
    return form.watch('items').reduce((acc, item) => acc + item.cost * item.quantity, 0);
  }, [form.watch('items')]);

  const handleAddProduct = (product: Product) => {
    const existingItem = fields.find(field => field.productId === product.id);
    if (existingItem) {
      toast({
        variant: 'destructive',
        title: 'Product already added',
        description: 'This product is already in the purchase order.',
      });
      return;
    }
    append({ productId: product.id, productName: product.name, quantity: 1, cost: product.cost || 0 });
  };


  async function onSubmit(values: PurchaseOrderFormValues) {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const supplier = suppliers?.find(s => s.id === values.supplierId);

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      if (values.status === 'Received') {
        // Use a transaction to ensure atomicity
        await runTransaction(firestore, async (transaction) => {
          const productRefs = values.items.map(item => doc(firestore, 'products', item.productId));
          const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

          // All reads are done. Now, start writes.
          const purchaseOrdersCollection = collection(firestore, 'purchaseOrders');
          const newOrderRef = doc(purchaseOrdersCollection);

          const newPurchaseOrder: Omit<PurchaseOrder, 'id'> = {
            ...values,
            supplierName: supplier.name,
            date: new Date().toISOString(),
            total,
          };
          transaction.set(newOrderRef, newPurchaseOrder);

          for (const [index, productDoc] of productDocs.entries()) {
            const item = values.items[index];
            if (!productDoc.exists()) {
              throw new Error(`Product ${item.productName} not found.`);
            }
            const currentStock = productDoc.data().stock;
            const newStock = currentStock + item.quantity;
            transaction.update(productRefs[index], { stock: newStock });

            // Log the adjustment
            const adjustmentLogRef = doc(collection(firestore, `products/${item.productId}/stockAdjustments`));
            const adjustmentLog: Omit<StockAdjustment, 'id'> = {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              reason: `Purchase Order Received`,
              date: new Date().toISOString(),
              newStock: newStock,
            };
            transaction.set(adjustmentLogRef, adjustmentLog);
          }
        });

      } else {
        // If status is not 'Received', just add the PO without updating stock
        const newPurchaseOrder: Omit<PurchaseOrder, 'id'> = {
          ...values,
          supplierName: supplier.name,
          date: new Date().toISOString(),
          total,
        };
        await addDocumentNonBlocking(collection(firestore, 'purchaseOrders'), newPurchaseOrder);
      }

      toast({
        title: 'Purchase Order Added',
        description: `PO from ${supplier.name} has been successfully created.`,
      });

      form.reset();
      setIsOpen(false);
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
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Purchase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add New Purchase Order</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new purchase order.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingSuppliers ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          suppliers?.map(sup => <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Payment Method</FormLabel>
                      <ManagePaymentMethodsDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0">Manage</Button>} />
                    </div>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingPaymentMethods ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          paymentMethods?.map(method => <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Received">Received</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-2/5'>Product</TableHead>
                        <TableHead className='w-1/5'>Quantity</TableHead>
                        <TableHead className='w-1/5'>Cost (₱)</TableHead>
                        <TableHead className='w-1/5 text-right'>Subtotal</TableHead>
                        <TableHead className='w-px'></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>{field.productName}</TableCell>
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
                              name={`items.${index}.cost`}
                              render={({ field }) => (
                                <Input type="number" step="0.01" {...field} />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            ₱{(form.watch(`items.${index}.cost`) * form.watch(`items.${index}.quantity`)).toFixed(2)}
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
              <ProductSelector onSelectProduct={handleAddProduct} />
              {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>}
            </div>

            <div className="flex justify-end items-center space-x-4">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold">₱{total.toFixed(2)}</span>
            </div>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Purchase Order'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


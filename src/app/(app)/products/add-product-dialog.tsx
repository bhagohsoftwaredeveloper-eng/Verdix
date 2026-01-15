'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getCategories, getBrands, getUnitsOfMeasure, getProducts, addProduct, getSubcategories } from './actions';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Form,
  FormControl,
  FormDescription,
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
import { PlusCircle, Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Category, Brand, UnitOfMeasure, Product, Supplier } from '@/lib/types';
import { ManageCategoriesDialog } from './ManageCategoriesDialog';
import { ManageBrandsDialog } from './ManageBrandsDialog';
import { ManageSubcategoriesDialog } from './ManageSubcategoriesDialog';
import { ManageUnitOfMeasureDialog } from './ManageUnitOfMeasureDialog';
import { Switch } from '@/components/ui/switch';

import { QuickAddChildDialog } from './quick-add-child-dialog';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  brand: z.string().min(1, 'Brand is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  additionalDescription: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  supplier: z.string().optional(),
  isSerialized: z.boolean().default(false),

  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  stock: z.coerce.number().int().nonnegative('Initial stock must be a non-negative integer'),
  reorderPoint: z.coerce.number().int().nonnegative('Reorder point must be non-negative'),

  price: z.coerce.number().positive("Price must be a positive number"),
  cost: z.coerce.number().nonnegative("Cost must be non-negative").optional(),

  parentId: z.string().optional(),
  conversionFactor: z.coerce.number().positive('Conversion factor must be positive').optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function AddProductDialog({ onProductAdded }: { onProductAdded?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoCreateChild, setAutoCreateChild] = useState(true);
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(true);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasure[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  const [parentProducts, setParentProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      const data = await getCategories();
      setCategories(data);
      setIsLoadingCategories(false);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadSubcategories = async () => {
      const data = await getSubcategories();
      setSubcategories(data);
      setIsLoadingSubcategories(false);
    };
    loadSubcategories();
  }, []);

  useEffect(() => {
    const loadBrands = async () => {
      const data = await getBrands();
      setBrands(data);
      setIsLoadingBrands(false);
    };
    loadBrands();
  }, []);

  useEffect(() => {
    const loadUnits = async () => {
      const data = await getUnitsOfMeasure();
      setUnitsOfMeasure(data);
      setIsLoadingUnits(false);
    };
    loadUnits();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await getProducts();
      setParentProducts(data.filter((p: Product) => !p.parentId));
      setIsLoadingProducts(false);
    };
    loadProducts();
  }, []);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      brand: '',
      description: '',
      additionalDescription: '',
      category: '',
      subcategory: '',
      isSerialized: false,
      unitOfMeasure: '',
      stock: 0,
      reorderPoint: 0,
      price: 0,
      cost: 0,
      sku: '',
      barcode: '',
      conversionFactor: 1,
    },
  });

  const isSerialized = form.watch('isSerialized');

  useEffect(() => {
    if (isSerialized) {
      form.setValue('stock', 0);
    }
  }, [isSerialized, form]);


  useEffect(() => {
    if (isOpen) {
      form.reset();
      setAutoCreateChild(true);
    }
  }, [isOpen, form]);

  async function onSubmit(values: ProductFormValues) {
    setIsSubmitting(true);

    try {
      const result = await addProduct({
        ...values,
        image: `https://picsum.photos/seed/${values.sku}/400/300`,
      });

      if (result.success) {
        toast({
          title: 'Product Added',
          description: result.message,
        });
        form.reset();
        onProductAdded?.();
        setIsOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem adding the product. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const generateSku = () => {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const brandPart = form.getValues('brand')?.substring(0, 3).toUpperCase() || 'BRD';
    const namePart = form.getValues('name')?.substring(0, 3).toUpperCase() || 'PRO';
    form.setValue('sku', `${brandPart}-${namePart}-${randomPart}`);
  };

  const generateBarcode = () => {
    const randomNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    form.setValue('barcode', randomNumber);
  };



  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Fill in the details below to add a new product.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  <TabsTrigger value="accounts">Accounts</TabsTrigger>
                  <TabsTrigger value="conversion">Conversion</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Cola-Cola" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input placeholder="e.g., COKE-PC" {...field} className="pr-10" />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                onClick={generateSku}
                              >
                                <Wand2 className="h-4 w-4" />
                                <span className="sr-only">Generate SKU</span>
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Barcode (UPC)</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input placeholder="e.g., 123456789012" {...field} className="pr-10" />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                onClick={generateBarcode}
                              >
                                <Wand2 className="h-4 w-4" />
                                <span className="sr-only">Generate Barcode</span>
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Brand</FormLabel>
                              <ManageBrandsDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0 text-primary">Manage</Button>} />
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a brand" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingBrands ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  brands?.map(brand => <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>)
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="A short description of the product." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="additionalDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Provide additional details like specifications or special notes." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Category</FormLabel>
                              <ManageCategoriesDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0 text-primary">Manage</Button>} />
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingCategories ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  categories?.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="subcategory"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Subcategory (Optional)</FormLabel>
                              <ManageSubcategoriesDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0 text-primary">Manage</Button>} />
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a subcategory" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingSubcategories ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  subcategories?.map(sub => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unitOfMeasure"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Base Unit of Measure</FormLabel>
                            <ManageUnitOfMeasureDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0 text-primary">Manage</Button>} />
                          </div>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingUnits ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                unitsOfMeasure?.map(uom => <SelectItem key={uom.id} value={uom.name}>{uom.name} ({uom.abbreviation})</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Stock</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} disabled={isSerialized} />
                          </FormControl>
                          {isSerialized && <FormDescription>Stock is managed via serial numbers.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reorderPoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reorder Point</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isSerialized"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Serialized Product</FormLabel>
                          <FormDescription>
                            Track individual units of this product with unique serial numbers.
                          </FormDescription>
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

                <TabsContent value="accounts" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (₱)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 99.99" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost (₱)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 50.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="conversion" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Auto-create Child Piece</FormLabel>
                        <FormDescription>
                          If the selected unit is a container (e.g., Case), automatically create a "Piece" child product.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={autoCreateChild}
                          onCheckedChange={setAutoCreateChild}
                        />
                      </FormControl>
                    </FormItem>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Product...
                    </>
                  ) : (
                    'Add Product'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent >
      </Dialog >

      <QuickAddChildDialog
        baseStock={undefined}
        onChildAdded={() => {
          // Refresh products when a child is added
          window.location.reload();
        }}
        products={parentProducts}
      />
    </>
  );
}

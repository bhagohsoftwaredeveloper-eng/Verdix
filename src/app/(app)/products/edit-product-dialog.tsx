'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { PlusCircle, Pencil, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Category, Product, Brand, UnitOfMeasure, Supplier, Account } from '@/lib/types';
import { ManageCategoriesDialog } from './ManageCategoriesDialog';
import { ManageBrandsDialog } from './ManageBrandsDialog';
import { ManageSubcategoriesDialog } from './ManageSubcategoriesDialog';
import { ManageUnitOfMeasureDialog } from './ManageUnitOfMeasureDialog';
import { ManageSuppliersDialog } from './ManageSuppliersDialog';
import { ManageAccountsDialog } from './ManageAccountsDialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { ManageWarehousesDialog } from '../sales/ManageWarehousesDialog';
import { updateProduct, getBrands, getCategories, getSubcategories, getUnitsOfMeasure, getSuppliers, getAccounts, getWarehouses } from './actions';
import { Wand2 } from 'lucide-react'; // Added Wand2 for consistency if needed, though mostly for generation

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
  warehouse: z.string().optional(),
  isSerialized: z.boolean().default(false),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  reorderPoint: z.coerce.number().int().nonnegative('Reorder point must be non-negative'),
  price: z.coerce.number().positive("Price must be a positive number"),
  cost: z.coerce.number().nonnegative("Cost must be non-negative").optional(),
  incomeAccount: z.string().optional(),
  expenseAccount: z.string().optional(),
  conversionFactor: z.coerce.number().positive('Conversion factor must be positive').optional(),
  conversionFactors: z.array(z.object({
    unit: z.string(),
    factor: z.coerce.number().positive('Conversion factor must be positive'),
  })).transform(arr => arr.filter(cf => cf.unit.trim() !== '')),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function EditProductDialog({ product, onProductUpdated }: { product: Product; onProductUpdated?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const loadOptions = useCallback(async () => {
    setBrands(await getBrands());
    setCategories(await getCategories());
    setSubcategories(await getSubcategories());
    setUnits(await getUnitsOfMeasure());
    setSuppliers(await getSuppliers());
    setAccounts(await getAccounts());
    setWarehouses(await getWarehouses());
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen, loadOptions]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      ...product,
      cost: product.cost ?? 0,
      barcode: product.barcode ?? '',
      additionalDescription: product.additionalDescription ?? '',
      incomeAccount: product.incomeAccount ?? '',
      expenseAccount: product.expenseAccount ?? '',
      warehouse: product.warehouse ?? '',
      subcategory: product.subcategory ?? '',
      supplier: product.supplier ?? '',
      unitOfMeasure: product.unitOfMeasure ?? '',
      conversionFactors: product.conversionFactors || [],
    },
  });

  const { fields: conversionFactorFields, append: appendConversionFactor, remove: removeConversionFactor } = useFieldArray({
    control: form.control,
    name: 'conversionFactors',
  });

  const selectedSupplierId = form.watch('supplier');
  const selectedUnitOfMeasure = form.watch('unitOfMeasure');
  const costValue = form.watch('cost');

  useEffect(() => {
    if (product && isOpen) {
        const sanitizedProduct = {
            ...product,
            cost: product.cost ?? 0,
            barcode: product.barcode ?? '',
            additionalDescription: product.additionalDescription ?? '',
            incomeAccount: product.incomeAccount ?? '',
            expenseAccount: product.expenseAccount ?? '',
            warehouse: product.warehouse ?? '',
            subcategory: product.subcategory ?? '',
            supplier: product.supplier ?? '',
            unitOfMeasure: product.unitOfMeasure ?? '',
            conversionFactors: product.conversionFactors || [],
        };
        console.log('Resetting form with:', sanitizedProduct);
        form.reset(sanitizedProduct);
    }
  }, [product, isOpen, form]);

  // Calculate price based on supplier markup when supplier or cost changes
  useEffect(() => {
    if (selectedSupplierId && costValue && costValue > 0 && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      if (supplier && supplier.markupPercentage) {
        const markupPrice = costValue * (1 + supplier.markupPercentage / 100);
        form.setValue('price', parseFloat(markupPrice.toFixed(2)));
      }
    }
  }, [selectedSupplierId, costValue, suppliers, form]);

  const saveChanges = async (values: ProductFormValues) => {
    console.log('EditProductDialog saveChanges called with values:', values);
    // Filter out conversion factors with empty units to avoid schema validation errors
    values.conversionFactors = values.conversionFactors?.filter(cf => cf.unit.trim() !== '') || [];
    try {
      setIsSubmitting(true);

      const result = await updateProduct(product.id, values);

      console.log('updateProduct result:', result);

      if (result.success) {
        toast({
          title: 'Product Updated',
          description: result.message,
        });
        onProductUpdated?.();
        setIsOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error Updating Product',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error in EditProductDialog:', error);
      toast({
        variant: 'destructive',
        title: 'Error Updating Product',
        description: 'An unexpected error occurred. Check console for details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit product</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit this product</p>
          </TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-3xl h-[600px] flex flex-col overflow-hidden" style={{ height: '790px' }}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the details for {product.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-1">
            <Form {...form}>
              <form id="edit-product-form" onSubmit={form.handleSubmit(saveChanges, (errors) => console.log('Form validation errors:', errors))}>
                <div className="h-[520px]">
                  <Tabs defaultValue="basic" className="w-full h-full">
                    <TabsList className="grid w-fit grid-cols-4 mx-auto">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="inventory">Inventory</TabsTrigger>
                      <TabsTrigger value="accounts">Accounts</TabsTrigger>
                      <TabsTrigger value="conversion">Conversion</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4 p-6 h-[450px] overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="brand"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Brand</FormLabel>
                                <ManageBrandsDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0">Manage</Button>} onBrandAdded={loadOptions} />
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a brand" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {brands?.map((brand: Brand) => <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>)}
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
                          name="sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly className="bg-muted" />
                              </FormControl>
                              <FormDescription>SKU cannot be changed after creation.</FormDescription>
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
                              <FormControl>
                                <Input placeholder="e.g., 123456789012" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Category</FormLabel>
                                <ManageCategoriesDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0">Manage</Button>} onCategoryAdded={loadOptions} />
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories?.map((cat: Category) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
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
                                <ManageSubcategoriesDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0">Manage</Button>} onSubcategoryAdded={loadOptions} />
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a subcategory" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {subcategories?.map((sub: Category) => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="inventory" className="space-y-4 p-6 h-[450px] overflow-y-auto">
                      <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Supplier (Optional)</FormLabel>
                              <ManageSuppliersDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0">Manage</Button>} onSupplierAdded={loadOptions} />
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a supplier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {suppliers?.map((supplier: Supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="warehouse"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Warehouse (Optional)</FormLabel>
                              <ManageWarehousesDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0">Manage</Button>} onChange={loadOptions} />
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a warehouse" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {warehouses?.map((warehouse: any) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="unitOfMeasure"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Unit of Measure</FormLabel>
                                <ManageUnitOfMeasureDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0">Manage</Button>} onUnitAdded={loadOptions} />
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {units?.map((uom: UnitOfMeasure) => (
                                    <SelectItem key={uom.id} value={uom.name}>
                                      {uom.name} ({uom.abbreviation})
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
                          name="reorderPoint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reorder Point</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 20" value={field.value} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="cost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cost (₱)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 50.00" value={field.value || ''} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price (₱)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 99.99" value={field.value} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="accounts" className="space-y-4 p-6 h-[450px] overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="incomeAccount"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Income Account (Optional)</FormLabel>
                                <ManageAccountsDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0">Manage</Button>} onAccountAdded={() => {
                                  // Reload accounts when a new account is added
                                  getAccounts().then(setAccounts);
                                }} />
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select income account" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {accounts?.filter(account => account.type === 'income').map((account: Account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {account.name} {account.code ? `(${account.code})` : ''}
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
                          name="expenseAccount"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Expense Account (Optional)</FormLabel>
                                <ManageAccountsDialog trigger={<Button variant="link" size="sm" type="button" className="h-auto p-0">Manage</Button>} onAccountAdded={() => {
                                  // Reload accounts when a new account is added
                                  getAccounts().then(setAccounts);
                                }} />
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select expense account" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {accounts?.filter(account => account.type === 'expense').map((account: Account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {account.name} {account.code ? `(${account.code})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="conversion" className="space-y-4 p-6 h-[450px] overflow-y-auto">
                      {/* Conversion Factors List */}
                      <div className="rounded-md border p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-sm font-medium leading-none">Conversion Factors</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Define how other units convert to the base unit (e.g., 1 Box = 12 Pieces).
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendConversionFactor({ unit: '', factor: 1 })}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Unit
                          </Button>
                        </div>

                        {conversionFactorFields.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-muted/50">
                            <Wand2 className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No conversion factors added yet.</p>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => appendConversionFactor({ unit: '', factor: 1 })}
                              className="mt-1"
                            >
                              Add your first conversion
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {conversionFactorFields.map((field, index) => (
                              <div key={field.id} className="flex items-end gap-3 p-3 bg-card border rounded-md shadow-sm">
                                <div className="pb-3 text-sm font-bold text-muted-foreground self-center mt-6">
                                  1
                                </div>
                                <div className="flex-1 min-w-[150px]">
                                  <FormField
                                    control={form.control}
                                    name={`conversionFactors.${index}.unit`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Unit Name</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select unit" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {units?.map((uom: UnitOfMeasure) => ( // Removed filter for edit mode or need to be careful? Add product filtered it. Edit product might need to ensure current value is valid. I'll stick to displaying all OTHER units.
                                              // Wait, in Add Product I did: unitsOfMeasure?.filter(u => u.name !== selectedUnitOfMeasure)
                                              // I should probably do same here if I have selectedUnitOfMeasure available.
                                              // In step 223 I added `const selectedUnitOfMeasure = form.watch('unitOfMeasure');`. So I can use it.
                                              uom.name !== selectedUnitOfMeasure && (
                                                <SelectItem key={uom.id} value={uom.name}>
                                                  {uom.name} ({uom.abbreviation})
                                                </SelectItem>
                                              )
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="pb-3 text-sm font-medium text-muted-foreground self-center mt-6">
                                  equals
                                </div>
                                <div className="w-[120px]">
                                  <FormField
                                    control={form.control}
                                    name={`conversionFactors.${index}.factor`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Quantity</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Qty"
                                            value={field.value}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="pb-3 text-sm font-medium text-muted-foreground self-center mt-6 truncate max-w-[100px]" title={selectedUnitOfMeasure || 'Base Unit'}>
                                  {selectedUnitOfMeasure || 'Base Unit'}
                                </div>
                                <div className="pb-1 self-center mt-5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                    onClick={() => removeConversionFactor(index)}
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remove</span>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
            <Button type="submit" form="edit-product-form" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

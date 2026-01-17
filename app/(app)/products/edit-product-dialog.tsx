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
import { PlusCircle, Pencil, Loader2, X, Plus, Wand2 } from 'lucide-react';
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

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="1em" 
      height="1em" 
      viewBox="0 0 24 24"
      className={className}
    >
      <path 
        fill="currentColor" 
        d="M10 18v-4H6.816c-.422 0-.645-.24-.868-.617c-.223-.377-.28-.702-.28-1.383V7H4V5h4v4h3.184c.422 0 .645.24.868.617c-.223-.377-.28.702-.28 1.383v.831c0 .68-.057 1.006-.28 1.383c-.223.377-.446.617-.868.617H12v4zm2-6.831c0-.491.062-.83.184-1.018c.123-.188.31-.35.564-.515c.254-.166.52-.28.802-.344V7h2V5h-4v3.831c.491.062.83.184 1.018.366c.188.182.35.436.515.762c.166.326.28.675.344 1.047h2v2h-2c-.062.372-.184.72-.366 1.047c-.326-.182-.58-.436-.762-.762c-.182-.326-.304-.675-.366-1.047z" 
      />
    </svg>
  );
}
import { updateProduct, getBrands, getCategories, getSubcategories, getUnitsOfMeasure, getSuppliers, getAccounts, getWarehouses } from './actions';

import { ProductSuppliers } from './product-suppliers';

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
  priceLevels: z.array(z.object({
    levelId: z.string().min(1, 'Level is required'),
    price: z.coerce.number().positive('Price must be positive'),
  })).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function EditProductDialog({ 
  product, 
  onProductUpdated,
  productOptions: externalProductOptions,
  onOptionsRefresh
}: { 
  product: Product; 
  onProductUpdated?: () => void;
  productOptions?: any;
  onOptionsRefresh?: () => void;
}) {
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
  const [priceLevels, setPriceLevels] = useState<any[]>([]);
  const [isLoadingPriceLevels, setIsLoadingPriceLevels] = useState(false);

  // Use pre-loaded data from parent when available
  useEffect(() => {
    if (externalProductOptions) {
      setBrands(externalProductOptions.brands || []);
      setCategories(externalProductOptions.categories || []);
      setSubcategories(externalProductOptions.subcategories || []);
      setUnits(externalProductOptions.units || []);
      setSuppliers(externalProductOptions.suppliers || []);
      setAccounts(externalProductOptions.accounts || []);
      setWarehouses(externalProductOptions.warehouses || []);
      setPriceLevels(externalProductOptions.priceLevels || []);
      setIsLoadingPriceLevels(false);
    }
  }, [externalProductOptions]);

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
      subcategory: product.subcategory ?? '', // Handle null
      supplier: product.supplier ?? '', // Handle null
      unitOfMeasure: product.unitOfMeasure ?? '', // Handle null
      conversionFactor: product.conversionFactor ?? 1, // Handle null/0 by defaulting to 1
      conversionFactors: product.conversionFactors || [],
      priceLevels: product.priceLevels || [],
    },
  });

  const { fields: conversionFactorFields, append: appendConversionFactor, remove: removeConversionFactor } = useFieldArray({
    control: form.control,
    name: 'conversionFactors',
  });

  const { fields: priceLevelFields, append: appendPriceLevel, remove: removePriceLevel } = useFieldArray({
    control: form.control,
    name: "priceLevels",
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
          subcategory: product.subcategory ?? '', // Handle null
          supplier: product.supplier ?? '', // Handle null
          unitOfMeasure: product.unitOfMeasure ?? '', // Handle null
          conversionFactor: product.conversionFactor ?? 1, // Handle null/0 by defaulting to 1
          conversionFactors: product.conversionFactors || [],
          priceLevels: product.priceLevels || [],
      };
      console.log('Resetting form with:', sanitizedProduct);
      form.reset(sanitizedProduct);
    }
  }, [product, isOpen, form]);

  const applySupplierMarkup = () => {
    const cost = form.getValues('cost');
    const supplierId = form.getValues('supplier');
    const supplier = suppliers.find(s => s.id === supplierId);

    if (!cost) {
      toast({
        variant: 'destructive',
        title: 'Cost Required',
        description: 'Please enter the cost before applying markup.',
      });
      return;
    }

    if (!supplier || supplier.markupPercentage === undefined) {
      toast({
        variant: 'destructive',
        title: 'Supplier Markup Not Found',
        description: 'The selected supplier does not have a markup percentage defined.',
      });
      return;
    }

    const markup = supplier.markupPercentage / 100;
    const basePrice = cost * (1 + markup);
    
    // Apply to price levels
    let firstLevelPrice = basePrice;

    if (priceLevels.length > 0) {
      priceLevels.forEach((level) => {
        let levelMarkup = markup;
        const name = level.name.toLowerCase();
        
        if (name.includes('wholesale')) {
          levelMarkup = markup * 0.7;
        } else if (name.includes('vip')) {
          levelMarkup = markup * 0.85;
        } else if (!level.isDefault) {
          levelMarkup = markup * 0.9;
        }

        const levelPrice = parseFloat((cost * (1 + levelMarkup)).toFixed(2));
        
        if (level.isDefault) {
            firstLevelPrice = levelPrice;
        }

        // Find if this level is already in priceLevelFields
        const fieldIndex = priceLevelFields.findIndex(f => (f as any).levelId === level.id);
        if (fieldIndex > -1) {
          form.setValue(`priceLevels.${fieldIndex}.price`, levelPrice);
        } else {
          appendPriceLevel({ levelId: level.id, price: levelPrice });
        }
      });
    } else {
       form.setValue('price', parseFloat(basePrice.toFixed(2)));
    }
    
    // Always sync the main price to the default level's price
    form.setValue('price', firstLevelPrice);

    toast({
      title: 'Markup Applied',
      description: `Calculated prices based on ${supplier.name}'s ${supplier.markupPercentage}% markup.`,
    });
  };

  const saveChanges = async (values: ProductFormValues) => {
    console.log('EditProductDialog saveChanges called with values:', values);
    // Filter out conversion factors with empty units to avoid schema validation errors
    values.conversionFactors = values.conversionFactors?.filter(cf => cf.unit.trim() !== '') || [];
    try {
      setIsSubmitting(true);

      const result = await updateProduct(product.id, values);

      console.log('updateProduct result:', result);
      
      // MOCK API CAILL
      // console.log('API Disabled: Mock Save Success');
      // const result = { success: true, message: 'Mock saved successfully' };

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
                <div className="min-h-[520px]">
                  <Tabs defaultValue="basic" className="w-full h-full">
                    <TabsList className="w-full h-auto justify-start rounded-none border-b bg-transparent p-0">
                      <TabsTrigger 
                        value="basic"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                      >
                        Basic Info
                      </TabsTrigger>
                      <TabsTrigger 
                        value="inventory"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                      >
                        Inventory
                      </TabsTrigger>
                      <TabsTrigger 
                        value="suppliers"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                      >
                        Suppliers
                      </TabsTrigger>
                      <TabsTrigger 
                        value="price-levels"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                      >
                        Price Levels
                      </TabsTrigger>
                      <TabsTrigger 
                        value="accounts"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                      >
                        Accounts
                      </TabsTrigger>
                      <TabsTrigger 
                        value="conversion"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                      >
                        Conversion
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4 p-6">
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
                              <FormLabel>Brand</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a brand" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {brands?.map((brand: Brand) => <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>)}
                                  <div className="p-1 w-full border-t mt-1">
                                      <ManageBrandsDialog trigger={
                                          <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                              <Plus className="mr-2 h-4 w-4" />
                                              Manage Brands
                                          </Button>
                                      } onBrandAdded={onOptionsRefresh} />
                                  </div>
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
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories?.map((cat: Category) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                                  <div className="p-1 w-full border-t mt-1">
                                      <ManageCategoriesDialog trigger={
                                          <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                              <Plus className="mr-2 h-4 w-4" />
                                              Manage Categories
                                          </Button>
                                      } onCategoryAdded={onOptionsRefresh} />
                                  </div>
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
                              <FormLabel>Subcategory (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a subcategory" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {subcategories?.map((sub: Category) => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)}
                                  <div className="p-1 w-full border-t mt-1">
                                      <ManageSubcategoriesDialog trigger={
                                          <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                              <Plus className="mr-2 h-4 w-4" />
                                              Manage Subcategories
                                          </Button>
                                      } onSubcategoryAdded={onOptionsRefresh} />
                                  </div>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="inventory" className="space-y-4 p-6">


                      <FormField
                        control={form.control}
                        name="warehouse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warehouse (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a warehouse" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {warehouses?.map((warehouse: any) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}
                                <div className="p-1 w-full border-t mt-1">
                                    <ManageWarehousesDialog trigger={
                                        <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Manage Warehouses
                                        </Button>
                                    } onChange={onOptionsRefresh} />
                                </div>
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
                              <FormLabel>Unit of Measure</FormLabel>
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
                                  <div className="p-1 w-full border-t mt-1">
                                      <ManageUnitOfMeasureDialog trigger={
                                          <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                              <Plus className="mr-2 h-4 w-4" />
                                              Manage UOM
                                          </Button>
                                      } onUnitAdded={onOptionsRefresh} />
                                  </div>
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
                              <div className="flex items-center justify-between h-6">
                                <FormLabel>Cost (₱)</FormLabel>
                              </div>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 50.00" value={field.value || ''} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                      </div>
                    </TabsContent>
                    <TabsContent value="accounts" className="space-y-4 p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="incomeAccount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Income Account (Optional)</FormLabel>
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
                                  <div className="p-1 w-full border-t mt-1">
                                      <ManageAccountsDialog trigger={
                                          <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                              <Plus className="mr-2 h-4 w-4" />
                                              Manage Accounts
                                          </Button>
                                      }
                                        onAccountAdded={(newAccount) => {
                                          onOptionsRefresh?.();
                                          if (newAccount.type === 'income') {
                                            form.setValue('incomeAccount', newAccount.id);
                                          }
                                        }}
                                        onAccountUpdated={() => {
                                          onOptionsRefresh?.();
                                        }}
                                      />
                                  </div>
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
                              <FormLabel>Expense Account (Optional)</FormLabel>
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
                                  <div className="p-1 w-full border-t mt-1">
                                      <ManageAccountsDialog trigger={
                                          <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                              <Plus className="mr-2 h-4 w-4" />
                                              Manage Accounts
                                          </Button>
                                      }
                                        onAccountAdded={(newAccount) => {
                                          onOptionsRefresh?.();
                                          if (newAccount.type === 'expense') {
                                            form.setValue('expenseAccount', newAccount.id);
                                          }
                                        }}
                                        onAccountUpdated={() => {
                                          onOptionsRefresh?.();
                                        }}
                                      />
                                  </div>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="suppliers" className="space-y-4 p-6">
                      <ProductSuppliers productId={product.id} onUpdate={() => {
                          // Optionally refresh parent or show success
                          if (onProductUpdated) onProductUpdated();
                      }} />
                    </TabsContent>
                    <TabsContent value="conversion" className="space-y-4 p-6">
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
                    <TabsContent value="price-levels" className="space-y-4 p-6">
                    <div className="space-y-4">
                      <div className="rounded-md border p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-sm font-medium leading-none">Price Levels</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Override the base price for specific customer segments.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendPriceLevel({ levelId: '', price: form.getValues('price') || 0 })}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Level Price
                          </Button>
                        </div>

                        {priceLevelFields.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-muted/50">
                            <CurrencyIcon className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No price level overrides added yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {priceLevelFields.map((field, index) => (
                              <div key={field.id} className="flex gap-4 items-end border p-3 rounded-md bg-muted/30">
                                <div className="flex-1">
                                  <FormField
                                    control={form.control}
                                    name={`priceLevels.${index}.levelId`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Level</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select level" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {isLoadingPriceLevels ? (
                                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                                            ) : (
                                              priceLevels?.map(level => (
                                                <SelectItem key={level.id} value={level.id}>
                                                  {level.name}
                                                </SelectItem>
                                              ))
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                  <div className="flex-1">
                                    <FormField
                                      control={form.control}
                                      name={`priceLevels.${index}.price`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Price (₱)</FormLabel>
                                           <div className="flex gap-2 items-center">
                                            <FormControl>
                                              <Input 
                                                type="number" 
                                                step="0.01" 
                                                placeholder="0.00" 
                                                value={field.value} 
                                                onChange={(e) => {
                                                  const newVal = parseFloat(e.target.value) || 0;
                                                  field.onChange(newVal);
                                                  
                                                  // Sync with main price if this is the default level
                                                  const currentLevelId = form.getValues(`priceLevels.${index}.levelId`);
                                                  const levelDef = priceLevels.find(l => l.id === currentLevelId);
                                                  
                                                  if (levelDef?.isDefault || priceLevels.length === 1) {
                                                      form.setValue('price', newVal);
                                                  }
                                                }} 
                                              />
                                            </FormControl>
                                            {/* Show apply markup button ONLY on the Price Levels tab now */}
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-primary"
                                                title="Apply Supplier Markup"
                                                onClick={applySupplierMarkup}
                                            >
                                                <Wand2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive h-10 w-10 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => removePriceLevel(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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

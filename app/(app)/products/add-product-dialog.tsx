'use client';

import { useState, useEffect } from 'react';
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
import { PlusCircle, Loader2, Wand2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Category, Brand, UnitOfMeasure, Product, Supplier, Account } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCategories, getBrands, getSubcategories, getUnitsOfMeasure, addProduct, getSuppliers, getAccounts, getAccountsByType, getWarehouses } from './actions';
import { ManageCategoriesDialog } from './ManageCategoriesDialog';
import { ManageBrandsDialog } from './ManageBrandsDialog';
import { ManageSubcategoriesDialog } from './ManageSubcategoriesDialog';
import { ManageUnitOfMeasureDialog } from './ManageUnitOfMeasureDialog';

import { ManageAccountsDialog } from './ManageAccountsDialog';

import { ManageWarehousesDialog } from '../sales/ManageWarehousesDialog';
import { AddSupplierMappingDialog } from './AddSupplierMappingDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Star, Plus } from 'lucide-react';
import { SupplierProductMapping } from '@/lib/types';


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
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  stock: z.coerce.number().int().nonnegative('Initial stock must be a non-negative integer'),
  reorderPoint: z.coerce.number().int().nonnegative('Reorder point must be non-negative'),
  price: z.coerce.number().positive("Price must be a positive number"),
  cost: z.coerce.number().nonnegative("Cost must be non-negative").optional(),
  incomeAccount: z.string().optional(),
  expenseAccount: z.string().optional(),
  parentId: z.string().optional(),
  conversionFactor: z.coerce.number().positive('Conversion factor must be positive').optional(),
  conversionFactors: z.array(z.object({
    unit: z.string().min(1, 'Unit is required'),
    factor: z.coerce.number().positive('Factor must be positive'),
  })).optional(),
  priceLevels: z.array(z.object({
    levelId: z.string().min(1, 'Level is required'),
    price: z.coerce.number().positive('Price must be positive'),
  })).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function AddProductDialog({ 
  onProductAdded, 
  productOptions: externalProductOptions,
  onOptionsRefresh 
}: { 
  onProductAdded?: () => void;
  productOptions?: any;
  onOptionsRefresh?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productType, setProductType] = useState<'parent' | 'child'>('parent');
  const [autoCreateChild, setAutoCreateChild] = useState(true);
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasure[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [incomeAccounts, setIncomeAccounts] = useState<Account[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]); // Using any for now to avoid cross-file type issues
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [priceLevels, setPriceLevels] = useState<any[]>([]);

  const [isLoadingPriceLevels, setIsLoadingPriceLevels] = useState(false);

  // Supplier Mappings State
  const [supplierMappings, setSupplierMappings] = useState<any[]>([]);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<any | null>(null);

  const handleAddSupplierMapping = (mapping: any) => {
    // If setting as primary, remove primary flag from others
    const newMappings = [...supplierMappings];
    if (mapping.isPrimary) {
        newMappings.forEach(m => m.isPrimary = false);
    }
    
    // Check if supplier already exists
    const existingIndex = newMappings.findIndex(m => m.supplierId === mapping.supplierId);
    if (existingIndex >= 0) {
        newMappings[existingIndex] = mapping;
    } else {
        newMappings.push(mapping);
    }
    setSupplierMappings(newMappings);
  };

  const handleRemoveSupplierMapping = (supplierId: string) => {
    setSupplierMappings(prev => prev.filter(m => m.supplierId !== supplierId));
  };
 
  const openSupplierDialog = (mapping?: any) => {
      setEditingMapping(mapping || null);
      setIsSupplierDialogOpen(true);
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      brand: '',
      description: '',
      additionalDescription: '',
      category: '',
      subcategory: '',
      supplier: '',
      warehouse: '',
      unitOfMeasure: '',
      stock: 0,
      reorderPoint: 0,
      price: 0,
      cost: 0,
      sku: '',
      barcode: '',
      conversionFactor: 1,
      conversionFactors: [],
      priceLevels: [],
    },
  });

  const { fields: conversionFactorFields, append: appendConversionFactor, remove: removeConversionFactor } = useFieldArray({
    control: form.control,
    name: "conversionFactors",
  });

  const { fields: priceLevelFields, append: appendPriceLevel, remove: removePriceLevel } = useFieldArray({
    control: form.control,
    name: "priceLevels",
  });

  const selectedUnitOfMeasure = form.watch('unitOfMeasure');

  // Use pre-loaded data from parent when available
  useEffect(() => {
    if (externalProductOptions) {
      setCategories(externalProductOptions.categories || []);
      setSubcategories(externalProductOptions.subcategories || []);
      setBrands(externalProductOptions.brands || []);
      setUnitsOfMeasure(externalProductOptions.units || []);
      setSuppliers(externalProductOptions.suppliers || []);
      setWarehouses(externalProductOptions.warehouses || []);
      setPriceLevels(externalProductOptions.priceLevels || []);

      // Initialize default price level if form is empty
      const systemPriceLevels = externalProductOptions.priceLevels || [];
      const currentPriceLevels = form.getValues('priceLevels') || [];
      
      if (currentPriceLevels.length === 0 && systemPriceLevels.length > 0) {
          // Find default level or take first
          const defaultLevel = systemPriceLevels.find((l:any) => l.isDefault) || systemPriceLevels[0];
          if (defaultLevel) {
              appendPriceLevel({ levelId: defaultLevel.id, price: 0 });
          }
      }

      // Handle accounts
      const accountsData = externalProductOptions.accounts || [];
      setAccounts(accountsData);
      setIncomeAccounts(accountsData.filter((a: Account) => a.type === 'income'));
      setExpenseAccounts(accountsData.filter((a: Account) => a.type === 'expense'));

      // Set default accounts
      const defaultIncome = accountsData.find((a: Account) => a.name === 'General Sales' && a.type === 'income');
      if (defaultIncome) form.setValue('incomeAccount', defaultIncome.id);

      const defaultExpense = accountsData.find((a: Account) => a.name === 'General Products Purchased' && a.type === 'expense');
      if (defaultExpense) form.setValue('expenseAccount', defaultExpense.id);
    }
  }, [externalProductOptions, form, appendPriceLevel]); // Added appendPriceLevel dep

  useEffect(() => {
    if (isOpen) {
      form.reset();

      setProductType('parent');
      setAutoCreateChild(true);
      setSupplierMappings([]);
    }
  }, [isOpen, form]);

  useEffect(() => {
    if (productType === 'parent') {
      form.setValue('conversionFactor', 1);
      form.setValue('parentId', undefined);
    }
  }, [productType, form]);

  useEffect(() => {
    if (productType === 'child') {
      // For child products, conversion factor should be manually entered by user
      // The previous auto-setting based on unit of measure is no longer valid
      // since conversion factors are now managed separately
    }
  }, [productType]);

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
    // We expect price levels to be available from external options or initialized
    let firstLevelPrice = basePrice;
    
    if (priceLevels.length > 0) {
      // Clear existing fields to rebuild them properly or update them?
      // Better to update existing or append if missing.
      
      // We will iterate through ALL available price level definitions (from settings)
      // and populate the form fields.
      
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
        
        // If this is the default level (usually Retail), it sets the base price
        if (level.isDefault) {
            firstLevelPrice = levelPrice;
        }

        const fieldIndex = priceLevelFields.findIndex(f => (f as any).levelId === level.id);
        if (fieldIndex > -1) {
          form.setValue(`priceLevels.${fieldIndex}.price`, levelPrice);
        } else {
          appendPriceLevel({ levelId: level.id, price: levelPrice });
        }
      });
    } else {
        // Fallback if no price levels defined in system
        form.setValue('price', parseFloat(basePrice.toFixed(2)));
    }

    // Always sync the main price to the default level's price (or the calculated one)
    form.setValue('price', firstLevelPrice);

    toast({
      title: 'Markup Applied',
      description: `Calculated prices based on ${supplier.name}'s ${supplier.markupPercentage}% markup.`,
    });
  };

  async function onSubmit(values: ProductFormValues) {
    setIsSubmitting(true);

    try {
      const result = await addProduct({
        ...values,
        ...values,
        image: `https://picsum.photos/seed/${values.sku}/400/300`,
        supplierMappings: supplierMappings,
      });

      if (result.success) {
        // Auto-create child product if enabled and this is a parent product
        if (productType === 'parent' && autoCreateChild && values.conversionFactors && values.conversionFactors.length > 0) {
          const firstConversion = values.conversionFactors[0];
          const childPrice = values.price / firstConversion.factor;
          const childCost = values.cost ? values.cost / firstConversion.factor : undefined;

          const childData = {
            name: `${values.name} (${firstConversion.unit})`,
            brand: values.brand,
            sku: `${values.sku}-${firstConversion.unit.toLowerCase().replace(/\s+/g, '')}`,
            barcode: values.barcode ? `${values.barcode}-${firstConversion.unit.toLowerCase()}` : undefined,
            description: `${values.description} - ${firstConversion.unit}`,
            additionalDescription: values.additionalDescription,
            category: values.category,
            subcategory: values.subcategory,
            supplier: values.supplier,
            unitOfMeasure: firstConversion.unit,
            stock: 0, // Child products start with 0 stock
            reorderPoint: 0,
            price: childPrice,
            cost: childCost,
            parentId: result.productId,
            conversionFactor: firstConversion.factor,
            image: `https://picsum.photos/seed/${values.sku}-${firstConversion.unit}/400/300`,
          };

          const childResult = await addProduct(childData);

          if (!childResult.success) {
            console.warn('Failed to auto-create child product:', childResult.message);
            // Don't fail the entire operation, just warn
          }
        }

        toast({
          title: 'Product Added',
          description: `${values.name} has been successfully added.${productType === 'parent' && autoCreateChild && values.conversionFactors && values.conversionFactors.length > 0 ? ' Child unit auto-created.' : ''}`,
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col overflow-hidden !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new product.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 py-1">
          <Form {...form}>
            <form id="add-product-form" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="h-full">
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
                    {/* Buttons and Child Product Logic Removed as requested */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Row 1: Name and Brand */}
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
                                  {isLoadingBrands ? (
                                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                                  ) : (
                                    brands?.map((brand: Brand) => <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>)
                                  )}
                                  <div className="p-1 w-full border-t mt-1">
                                      <ManageBrandsDialog trigger={
                                          <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                              <Plus className="mr-2 h-4 w-4" />
                                              Manage Brands
                                          </Button>
                                      } />
                                  </div>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                        )}
                      />

                      {/* Row 2: SKU and Barcode */}
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

                      {/* Row 3: Description and Additional Description */}
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

                      {/* Row 4: Category and Subcategory */}
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
                              {isLoadingWarehouses ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                warehouses?.map((warehouse: any) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)
                              )}
                              <div className="p-1 w-full border-t mt-1">
                                  <ManageWarehousesDialog trigger={
                                      <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                          <Plus className="mr-2 h-4 w-4" />
                                          Manage Warehouses
                                      </Button>
                                  } onChange={() => {
                                    getWarehouses().then(setWarehouses);
                                  }} />
                              </div>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="unitOfMeasure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{productType === 'parent' ? 'Base Unit of Measure' : 'Unit of Measure'}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingUnits ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  unitsOfMeasure?.map((uom: UnitOfMeasure) => (
                                    <SelectItem key={uom.id} value={uom.name}>
                                      {uom.name} ({uom.abbreviation})
                                    </SelectItem>
                                  ))
                                )}
                                <div className="p-1 w-full border-t mt-1">
                                    <ManageUnitOfMeasureDialog trigger={
                                        <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Manage UOM
                                        </Button>
                                    } onUnitAdded={() => {
                                      getUnitsOfMeasure().then(setUnitsOfMeasure);
                                    }} />
                                </div>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {productType === 'child' && (
                        <FormField
                          control={form.control}
                          name="conversionFactor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Conversion Factor</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 12" value={field.value} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormDescription>How many base units are in this child unit?</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Stock</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" value={field.value} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                            </FormControl>
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
                  
                  <TabsContent value="suppliers" className="space-y-4 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium">Supplier Mappings</h4>
                            <p className="text-xs text-muted-foreground">Manage multiple suppliers for this product.</p>
                        </div>
                        <Button type="button" size="sm" onClick={() => openSupplierDialog()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Supplier
                        </Button>
                    </div>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Lead Time</TableHead>
                                    <TableHead>ROP</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {supplierMappings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                            No suppliers mapped yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    supplierMappings.map((mapping, index) => {
                                        const supplier = suppliers.find(s => s.id === mapping.supplierId);
                                        return (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    {mapping.isPrimary && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                                                </TableCell>
                                                <TableCell>
                                                    {supplier?.name || 'Unknown'}
                                                    {mapping.isPrimary && <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>}
                                                </TableCell>
                                                <TableCell>{mapping.leadTime} days</TableCell>
                                                <TableCell>{mapping.rop}</TableCell>
                                                <TableCell className="text-right">₱{mapping.cost?.toFixed(2) || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" type="button" onClick={() => openSupplierDialog(mapping)}>
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" size="sm" type="button" className="text-destructive" onClick={() => handleRemoveSupplierMapping(mapping.supplierId)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <AddSupplierMappingDialog
                        productId="new" // Special flag for local mode
                        isOpen={isSupplierDialogOpen}
                        onOpenChange={setIsSupplierDialogOpen}
                        onSuccess={(data: any) => handleAddSupplierMapping(data)}
                        editingMapping={editingMapping}
                        suppliers={suppliers}
                        onRefreshSuppliers={() => getSuppliers().then(setSuppliers)}
                    />
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
                                {isLoadingAccounts ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  incomeAccounts?.map((account: Account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {account.name} {account.code ? `(${account.code})` : ''}
                                    </SelectItem>
                                  ))
                                )}
                                <div className="p-1 w-full border-t mt-1">
                                    <ManageAccountsDialog trigger={
                                        <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Manage Accounts
                                        </Button>
                                    }
                                      onAccountAdded={(newAccount) => {
                                        if (newAccount.type === 'income') {
                                          getAccountsByType('income').then(setIncomeAccounts);
                                          form.setValue('incomeAccount', newAccount.id);
                                        }
                                      }}
                                      onAccountUpdated={() => {
                                        getAccountsByType('income').then(setIncomeAccounts);
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
                                {isLoadingAccounts ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  expenseAccounts?.map((account: Account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {account.name} {account.code ? `(${account.code})` : ''}
                                    </SelectItem>
                                  ))
                                )}
                                <div className="p-1 w-full border-t mt-1">
                                    <ManageAccountsDialog trigger={
                                        <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Manage Accounts
                                        </Button>
                                    }
                                      onAccountAdded={(newAccount) => {
                                        if (newAccount.type === 'expense') {
                                          getAccountsByType('expense').then(setExpenseAccounts);
                                          form.setValue('expenseAccount', newAccount.id);
                                        }
                                      }}
                                      onAccountUpdated={() => {
                                        getAccountsByType('expense').then(setExpenseAccounts);
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
                  <TabsContent value="conversion" className="space-y-4 p-6">
                    {/* Conversion Factors Section */}
                    <div className="space-y-4">
                      {/* Auto-create Child Unit Switch */}
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                        <div className="space-y-0.5">
                          <Label className="text-base">Auto-create Child Unit</Label>
                          <p className="text-sm text-muted-foreground">
                            If enabled, automatically create a child unit based on conversion factors.
                          </p>
                        </div>
                        <Switch
                          checked={autoCreateChild}
                          onCheckedChange={setAutoCreateChild}
                        />
                      </div>

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
                                            {isLoadingUnits ? (
                                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                                            ) : (
                                              unitsOfMeasure?.filter(u => u.name !== selectedUnitOfMeasure) // Exclude base unit
                                                .map((uom: UnitOfMeasure) => (
                                                  <SelectItem key={uom.id} value={uom.name}>
                                                    {uom.name} ({uom.abbreviation})
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
                                            step="0.01" // Allow decimals if needed, though usually integer for pieces
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
                                                  // We need to check if the FULL level object corresponds to a default level
                                                  const currentLevelId = form.getValues(`priceLevels.${index}.levelId`);
                                                  const levelDef = priceLevels.find(l => l.id === currentLevelId);

                                                  // If it's the default level OR if there's only one level text and it matches
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
          <Button type="submit" form="add-product-form" disabled={isSubmitting}>
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
      </DialogContent>
    </Dialog>
  );
}

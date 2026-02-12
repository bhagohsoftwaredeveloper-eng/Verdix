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
import { Category, Product, Brand, UnitOfMeasure, Supplier, Account, TaxRate, SystemSettings } from '@/lib/types';

import { ManageCategoriesDialog } from './ManageCategoriesDialog';
import { ManageBrandsDialog } from './ManageBrandsDialog';
import { ManageSubcategoriesDialog } from './ManageSubcategoriesDialog';
import { ManageUnitOfMeasureDialog } from './ManageUnitOfMeasureDialog';
import { ManageSuppliersDialog } from './ManageSuppliersDialog';
import { ManageAccountsDialog } from './ManageAccountsDialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  reorderPoint: z.coerce.number().int().nonnegative().optional().default(0),
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
    minQuantity: z.number().min(0).optional(),
  })).optional(),
  vatStatus: z.string().default('YES (Subject to 12% VAT)'),
  availability: z.string().default('Available'),
  earnsPoints: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function EditProductDialog({ 
  product, 
  onProductUpdated,
  productOptions: externalProductOptions,
  onOptionsRefresh,
  trigger
}: { 
  product: Product; 
  onProductUpdated?: () => void;
  productOptions?: any;
  onOptionsRefresh?: () => void;
  trigger?: React.ReactNode;
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
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoadingPriceLevels, setIsLoadingPriceLevels] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);




  
  // Guard to prevent auto-calculation on initial form reset
  const isInitialLoad = useState(true);

  useEffect(() => {
    fetch('/api/pos-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
            setSystemSettings(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch settings', err));
  }, []);

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
      setTaxRates(externalProductOptions.taxRates || []);
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
      vatStatus: product.vatStatus || 'YES (Subject to 12% VAT)',
      availability: product.availability || 'Available',
      earnsPoints: product.earnsPoints ?? true,
      description: product.description ?? '',
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
  const watchedCost = form.watch('cost');
  const watchedCategoryName = form.watch('category');
  const watchedSubcategoryName = form.watch('subcategory');
  const watchedBrandName = form.watch('brand');
  
  // State for selected price level (for automatic price calculation)
  const [selectedPriceLevelId, setSelectedPriceLevelId] = useState<string>('');

  useEffect(() => {
    if (product && isOpen) {
      const sanitizedProduct = {
          ...product,
          cost: product.cost ?? 0,
          barcode: product.barcode ?? '',
          additionalDescription: product.additionalDescription ?? '',
          incomeAccount: product.incomeAccount ?? '',
          expenseAccount: product.expenseAccount ?? '',
          warehouse: product.warehouseId ?? product.warehouse ?? '',
          reorderPoint: product.reorderPoint ?? 0,
          subcategory: product.subcategory ?? '', // Handle null
          supplier: product.supplier ?? '', // Handle null
          unitOfMeasure: product.unitOfMeasure ?? '', // Handle null
          conversionFactor: product.conversionFactor ?? 1, // Handle null/0 by defaulting to 1
          conversionFactors: product.conversionFactors || [],
          priceLevels: product.priceLevels || [],
          vatStatus: product.vatStatus || 'YES (Subject to 12% VAT)',
          availability: product.availability || 'Available',
          earnsPoints: product.earnsPoints ?? true,
          description: product.description ?? '',
      };
      console.log('Resetting form with:', sanitizedProduct);
      form.reset(sanitizedProduct);
    }
  }, [product, isOpen, form]);

  const [markupSource, setMarkupSource] = useState<string | null>(null);

  // Track initial load to prevent overwriting existing prices
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isOpen) {
        // Reset initialization state when dialog opens
        setIsInitialized(false);
        // Small timeout to allow form.reset to complete before allowing calculations
        const timer = setTimeout(() => setIsInitialized(true), 1000);
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    // Skip if not initialized or automation disabled
    if (!isInitialized || !systemSettings?.enableAutomaticMarkup) {
        setMarkupSource(null);
        return;
    }

    const category = categories.find(c => c.name === watchedCategoryName);
    const subcategory = subcategories.find(s => s.name === watchedSubcategoryName);
    const brand = brands.find(b => b.name === watchedBrandName);
    const supplier = suppliers.find(s => s.id === selectedSupplierId);

    let markup = 0;
    let source = '';
    const priority = systemSettings.markupPriority || ["subcategory", "category", "brand"];

    for (const type of priority) {
        if (type === 'subcategory' && subcategory && subcategory.markupPercentage && subcategory.markupPercentage > 0) {
            markup = subcategory.markupPercentage;
            source = 'Subcategory';
            break;
        } else if (type === 'category' && category && category.markupPercentage && category.markupPercentage > 0) {
            markup = category.markupPercentage;
            source = 'Category';
            break;
        } else if (type === 'brand' && brand && brand.markupPercentage && brand.markupPercentage > 0) {
            markup = brand.markupPercentage;
            source = 'Brand';
            break;
        }
    }

    // Fallback to global default if no specific markup found
    if (!source && systemSettings.defaultMarkupPercentage && systemSettings.defaultMarkupPercentage > 0) {
        markup = systemSettings.defaultMarkupPercentage;
        source = 'Global Default';
    }

    if (source) {
      setMarkupSource(`Calculated from ${source} Markup (${markup}%)`);
      if (watchedCost && watchedCost > 0) {
          const basePrice = watchedCost * (1 + markup / 100);
          
          // Find default price level
          const defaultLevel = priceLevels.find((l: any) => l.isDefault) || priceLevels[0];
          
          // Calculate main price using default level's markup on top of basePrice
          // Exception: "Retail" level uses basePrice directly without additional markup
          let mainPrice = basePrice;
          if (defaultLevel && defaultLevel.percentageAdjustment) {
             // Check if default level is "Retail" - if so, skip markup
             if (defaultLevel.name?.toLowerCase() !== 'retail') {
                mainPrice = basePrice * (1 + defaultLevel.percentageAdjustment / 100);
             }
          }
          form.setValue('price', parseFloat(mainPrice.toFixed(2)));

          // Apply to all price levels: basePrice + level markup
          // Exception: "Retail" level uses basePrice directly
          if (priceLevels.length > 0) {
              const currentFields = form.getValues('priceLevels') || [];
              
              // Helper to find existing field index
              const getFieldIndex = (levelId: string) => currentFields.findIndex((f: any) => f.levelId === levelId);

              priceLevels.forEach((level: any) => {
                  // Check if this is the "Retail" level
                  let levelPrice;
                  if (level.name?.toLowerCase() === 'retail') {
                      // Retail uses basePrice directly, ignoring its markup percentage
                      levelPrice = parseFloat(basePrice.toFixed(2));
                  } else {
                      // Other levels apply their markup on top of basePrice
                      const levelMarkup = level.percentageAdjustment ?? 0;
                      levelPrice = parseFloat((basePrice * (1 + levelMarkup / 100)).toFixed(2));
                  }
                  
                  const index = getFieldIndex(level.id);
                  if (index >= 0) {
                      form.setValue(`priceLevels.${index}.price`, levelPrice);
                  }
              });
              
              // AUTO-POPULATE: Update all fields that exist in the form
              priceLevelFields.forEach((field, index) => {
                  const levelDef = priceLevels.find((l: any) => l.id === field.levelId);
                  if (levelDef) {
                      // Check if this is the "Retail" level
                      let levelPrice;
                      if (levelDef.name?.toLowerCase() === 'retail') {
                          // Retail uses basePrice directly
                          levelPrice = parseFloat(basePrice.toFixed(2));
                      } else {
                          // Other levels apply their markup
                          const levelMarkup = levelDef.percentageAdjustment ?? 0;
                          levelPrice = parseFloat((basePrice * (1 + levelMarkup / 100)).toFixed(2));
                      }
                      form.setValue(`priceLevels.${index}.price`, levelPrice);
                  }
              });
          }
      }
    } else {
      setMarkupSource(null);
    }

  }, [watchedCost, watchedCategoryName, watchedSubcategoryName, watchedBrandName, selectedSupplierId, categories, subcategories, brands, suppliers, form, priceLevels, priceLevelFields, systemSettings, isInitialized]);


  // Auto-update main price when a price level is selected
  useEffect(() => {
    if (selectedPriceLevelId) {
      const selectedLevel = priceLevels.find((l: any) => l.id === selectedPriceLevelId);
      if (selectedLevel) {
        const cost = form.getValues('cost');
        if (cost && cost > 0) {
          // Get category/brand markup
          const category = categories.find(c => c.name === form.getValues('category'));
          const subcategory = subcategories.find(s => s.name === form.getValues('subcategory'));
          const brand = brands.find(b => b.name === form.getValues('brand'));
          
          let markup = 0;
          const priority = systemSettings?.markupPriority || ["subcategory", "category", "brand"];
          
          for (const type of priority) {
            if (type === 'subcategory' && subcategory?.markupPercentage && subcategory.markupPercentage > 0) {
              markup = subcategory.markupPercentage;
              break;
            } else if (type === 'category' && category?.markupPercentage && category.markupPercentage > 0) {
              markup = category.markupPercentage;
              break;
            } else if (type === 'brand' && brand?.markupPercentage && brand.markupPercentage > 0) {
              markup = brand.markupPercentage;
              break;
            }
          }
          
          if (!markup && systemSettings?.defaultMarkupPercentage && systemSettings.defaultMarkupPercentage > 0) {
            markup = systemSettings.defaultMarkupPercentage;
          }
          
          const basePrice = cost * (1 + markup / 100);
          
          // Calculate price based on selected level
          let finalPrice;
          if (selectedLevel.name?.toLowerCase() === 'retail') {
            finalPrice = basePrice;
          } else {
            const levelMarkup = selectedLevel.percentageAdjustment ?? 0;
            finalPrice = basePrice * (1 + levelMarkup / 100);
          }
          
          form.setValue('price', parseFloat(finalPrice.toFixed(2)));
          
          // ALSO update all price level fields automatically
          if (priceLevelFields.length > 0) {
            priceLevelFields.forEach((field, index) => {
              const levelDef = priceLevels.find((l: any) => l.id === field.levelId);
              if (levelDef) {
                // Calculate price for each level
                let levelPrice;
                if (levelDef.name?.toLowerCase() === 'retail') {
                  levelPrice = parseFloat(basePrice.toFixed(2));
                } else {
                  const levelMarkup = levelDef.percentageAdjustment ?? 0;
                  levelPrice = parseFloat((basePrice * (1 + levelMarkup / 100)).toFixed(2));
                }
                form.setValue(`priceLevels.${index}.price`, levelPrice);
              }
            });
          }
        }
      }
    }
  }, [selectedPriceLevelId, priceLevels, priceLevelFields, form, categories, subcategories, brands, systemSettings]);

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
        window.dispatchEvent(new Event('stock-updated'));
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
        {trigger ? (
          <DialogTrigger asChild>
            {trigger}
          </DialogTrigger>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit product</span>
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit this product</p>
            </TooltipContent>
          </Tooltip>
        )}
        <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col overflow-hidden !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the details for {product.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-1">
            <Form {...form}>
              <form id="edit-product-form" onSubmit={form.handleSubmit(saveChanges, (errors) => console.log('Form validation errors:', errors))}>
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
                      <TabsTrigger 
                        value="loyalty"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                      >
                        Loyalty
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
                                    <div className="p-1 w-full border-b mb-1">
                                      <ManageBrandsDialog 
                                        onBrandAdded={() => {
                                            getBrands().then(setBrands);
                                        }}
                                        trigger={
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                type="button" 
                                                className="w-full justify-start font-normal h-8"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Manage Brands
                                            </Button>
                                        }
                                      />
                                    </div>
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
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="p-1 w-full border-b mb-1">
                                      <ManageCategoriesDialog 
                                        onCategoryAdded={() => {
                                            getCategories().then(setCategories);
                                        }}
                                        trigger={
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                type="button" 
                                                className="w-full justify-start font-normal h-8"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Manage Categories
                                            </Button>
                                        }
                                      />
                                  </div>
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
                              <FormLabel>Subcategory (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a subcategory" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="p-1 w-full border-b mb-1">
                                      <ManageSubcategoriesDialog 
                                        onSubcategoryAdded={() => {
                                            getSubcategories().then(setSubcategories);
                                        }}
                                        trigger={
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                type="button" 
                                                className="w-full justify-start font-normal h-8"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Manage Subcategories
                                            </Button>
                                        }
                                      />
                                  </div>
                                  {subcategories?.map((sub: Category) => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="inventory" className="space-y-4 p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="vatStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>VAT Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} defaultValue="YES (Subject to 12% VAT)">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select VAT status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {taxRates.map((rate) => (
                                    <SelectItem key={rate.id} value={rate.name}>
                                      {rate.name} {rate.rate > 0 ? `(${rate.rate}%)` : ''}
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
                          name="availability"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Availability</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} defaultValue="Available">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select availability" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Available">Available</SelectItem>
                                  <SelectItem value="Unavailable">Unavailable</SelectItem>
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
                          name="supplier"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Supplier (Optional)</FormLabel>
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a supplier" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="p-1 w-full border-b mb-1">
                                      <ManageSuppliersDialog 
                                        onSupplierAdded={() => {
                                            getSuppliers().then(setSuppliers);
                                        }}
                                        trigger={
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                type="button" 
                                                className="w-full justify-start font-normal h-8"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Manage Suppliers
                                            </Button>
                                        }
                                      />
                                  </div>
                                  {suppliers?.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}
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
                              <FormLabel>Warehouse (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a warehouse" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="p-1 w-full border-b mb-1">
                                      <ManageWarehousesDialog 
                                        onChange={() => {
                                            getWarehouses().then(setWarehouses);
                                        }}
                                        trigger={
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                type="button" 
                                                className="w-full justify-start font-normal h-8"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Manage Warehouses
                                            </Button>
                                        }
                                      />
                                  </div>
                                  {warehouses?.map((warehouse: any) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}
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
                          name="reorderPoint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reorder Point</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="0" value={field.value} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
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
                                  <div className="p-1 w-full border-b mb-1">
                                    <ManageUnitOfMeasureDialog 
                                      onUnitAdded={() => {
                                          getUnitsOfMeasure().then(setUnits);
                                      }}
                                      trigger={
                                          <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              type="button" 
                                              className="w-full justify-start font-normal h-8"
                                          >
                                              <Plus className="mr-2 h-4 w-4" />
                                              Manage UOM
                                          </Button>
                                      }
                                    />
                                  </div>
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
                                  <div className="p-1 w-full border-b mb-1">
                                      <ManageAccountsDialog 
                                        onAccountAdded={(newAccount) => {
                                            onOptionsRefresh?.();
                                            if (newAccount.type === 'income') {
                                                form.setValue('incomeAccount', newAccount.id);
                                            }
                                        }}
                                        onAccountUpdated={() => onOptionsRefresh?.()}
                                        trigger={
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                type="button" 
                                                className="w-full justify-start font-normal h-8"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Manage Accounts
                                            </Button>
                                        }
                                      />
                                  </div>
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
                              <FormLabel>Expense Account (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select expense account" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="p-1 w-full border-b mb-1">
                                      <ManageAccountsDialog 
                                        onAccountAdded={(newAccount) => {
                                            onOptionsRefresh?.();
                                            if (newAccount.type === 'expense') {
                                                form.setValue('expenseAccount', newAccount.id);
                                            }
                                        }}
                                        onAccountUpdated={() => onOptionsRefresh?.()}
                                        trigger={
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                type="button" 
                                                className="w-full justify-start font-normal h-8"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Manage Accounts
                                            </Button>
                                        }
                                      />
                                  </div>
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
                      {/* Price Level Selector for Auto-Calculate */}
                      <div className="rounded-md border p-4 bg-muted/30">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <Label htmlFor="price-level-selector" className="text-sm font-medium">
                              Select Price Level
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Choose a level to automatically calculate the main price
                            </p>
                          </div>
                          <div className="w-[200px]">
                            <Select value={selectedPriceLevelId} onValueChange={setSelectedPriceLevelId}>
                              <SelectTrigger id="price-level-selector">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent>
                                {isLoadingPriceLevels ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  priceLevels?.map(level => (
                                    <SelectItem key={level.id} value={level.id}>
                                      {level.name} ({level.percentageAdjustment}%)
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
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
                                          </div>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="w-[100px]">
                                    <FormField
                                      control={form.control}
                                      name={`priceLevels.${index}.minQuantity`}
                                      render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs text-nowrap">Min Qty</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number"
                                                    placeholder="0"
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                />
                                            </FormControl>
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
                    <TabsContent value="loyalty" className="space-y-4 p-6">
                    <div className="space-y-4">
                      <FormField
                          control={form.control}
                          name="earnsPoints"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-2">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Earns Loyalty Points
                                </FormLabel>
                                <FormDescription>
                                  Disable this if this product should not earn points. (Note: Products in categories with 5% markup are automatically excluded).
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
            {markupSource && (
              <span className="text-xs text-muted-foreground mr-auto ml-2 flex items-center">
                <Wand2 className="mr-1 h-3 w-3" />
                {markupSource}
              </span>
            )}
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

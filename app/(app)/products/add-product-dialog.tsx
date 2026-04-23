'use client';
import { calculateMarkupPercentage, calculateSuggestedPrice } from '@/lib/purchase-utils';

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
  SelectLabel,
  SelectGroup,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, PlusCircle, Loader2, Wand2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { Category, Brand, UnitOfMeasure, Product, Supplier, TaxRate, SystemSettings } from '@/lib/types';

import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCategories, getBrands, getSubcategories, getUnitsOfMeasure, addProduct, getSuppliers, getWarehouses, getDepartments } from './actions';
import { ManageCategoriesDialog } from './ManageCategoriesDialog';
import { ManageBrandsDialog } from './ManageBrandsDialog';
import { ManageDepartmentsDialog } from './ManageDepartmentsDialog';
import { ManageSubcategoriesDialog } from './ManageSubcategoriesDialog';
import { ManageUnitOfMeasureDialog } from './ManageUnitOfMeasureDialog';



import { ManageWarehousesDialog } from '../sales/ManageWarehousesDialog';
import { ManageSuppliersDialog } from './ManageSuppliersDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Star, Check, ChevronsUpDown } from 'lucide-react';
import { ManageShelfLocationsDialog } from './ManageShelfLocationsDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';



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
  department: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  additionalDescription: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  supplier: z.string().optional(),
  warehouse: z.string().optional(),
  shelfLocationIds: z.array(z.string()).optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  stock: z.coerce.number().int().nonnegative('Initial stock must be a non-negative integer'),
  reorderPoint: z.coerce.number().int().nonnegative().optional().default(0),
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
    levelId: z.string().min(1, 'Price level is required'),
    price: z.number().min(0, 'Price cannot be negative'),
    minQuantity: z.number().min(0).optional(),
  })).optional(),
  vatStatus: z.string().default('YES (Subject to 12% VAT)'),
  availability: z.string().default('Available'),
  earnsPoints: z.boolean().default(true),
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
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasure[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]); // Using any for now to avoid cross-file type issues
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [shelfLocations, setShelfLocations] = useState<any[]>([]);
  const [isLoadingShelfLocations, setIsLoadingShelfLocations] = useState(false);
  const [priceLevels, setPriceLevels] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);

  const [isLoadingPriceLevels, setIsLoadingPriceLevels] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const [dialogs, setDialogs] = useState({
    categories: false,
    brands: false,
    subcategories: false,
    suppliers: false,
    warehouses: false,
    shelfLocations: false,
    units: false,
    departments: false,
  });
  
  const [selects, setSelects] = useState({
    categories: false,
    brands: false,
    subcategories: false,
    suppliers: false,
    warehouses: false,
    shelfLocations: false,
    units: false,
    departments: false,
  });





  useEffect(() => {
    fetch(getApiUrl('/pos-settings'))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
            setSystemSettings(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch settings', err));
  }, []);




  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      brand: '',
      department: '',
      description: '',
      additionalDescription: '',
      category: '',
      subcategory: '',
      supplier: '',
      warehouse: '',
      shelfLocationIds: [],
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
      earnsPoints: true,
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
  
  // State for selected price level (for automatic price calculation)
  const [selectedPriceLevelId, setSelectedPriceLevelId] = useState<string>('');

  // Use pre-loaded data from parent when available
  useEffect(() => {
    if (externalProductOptions) {
      setCategories(externalProductOptions.categories || []);
      setSubcategories(externalProductOptions.subcategories || []);
      setBrands(externalProductOptions.brands || []);
      setUnitsOfMeasure(externalProductOptions.units || []);
      setSuppliers(externalProductOptions.suppliers || []);
      setWarehouses(externalProductOptions.warehouses || []);
      setShelfLocations(externalProductOptions.shelfLocations || []);
      setDepartments(externalProductOptions.departments || []);
      setPriceLevels(externalProductOptions.priceLevels || []);
      setTaxRates(externalProductOptions.taxRates || []);

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

    }
  }, [externalProductOptions, form, appendPriceLevel]); // Added appendPriceLevel dep

  useEffect(() => {
    if (isOpen) {
      form.reset();
      
      // Set default tax rate if available and valid
      if (taxRates.length > 0) {
        const defaultTax = taxRates.find(t => t.isDefault) || taxRates[0];
        form.setValue('vatStatus', defaultTax.name);
      }

      setProductType('parent');
      setAutoCreateChild(true);
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

  const watchedCost = form.watch('cost');
  const watchedCategoryName = form.watch('category');
  const watchedSubcategoryName = form.watch('subcategory');
  const watchedBrandName = form.watch('brand');
  const watchedSupplierId = form.watch('supplier');
  const [markupSource, setMarkupSource] = useState<string | null>(null);

  useEffect(() => {
    if (!systemSettings?.enableAutomaticMarkup) {
        setMarkupSource(null);
        return;
    }

    const { markup, source } = calculateMarkupPercentage(
        { 
            category: watchedCategoryName, 
            subcategory: watchedSubcategoryName, 
            brand: watchedBrandName,
            supplierId: watchedSupplierId
        },
        systemSettings,
        categories,
        subcategories,
        brands,
        suppliers
    );

    if (source) {
      setMarkupSource(`Calculated from ${source} Markup (${markup}%)`);
      if (watchedCost && watchedCost > 0) {
          // Calculate base price and default level price
          const defaultLevel = priceLevels.find((l: any) => l.isDefault) || priceLevels[0];
          const suggestedMainPrice = calculateSuggestedPrice(watchedCost, markup, 0, defaultLevel);
          
          form.setValue('price', parseFloat(suggestedMainPrice.toFixed(2)));

          // Apply to all price levels
          if (priceLevels.length > 0) {
              const currentFields = form.getValues('priceLevels') || [];
              const getFieldIndex = (levelId: string) => currentFields.findIndex((f: any) => f.levelId === levelId);

              priceLevels.forEach((level: any) => {
                  const levelPrice = calculateSuggestedPrice(watchedCost, markup, 0, level);
                  const index = getFieldIndex(level.id);
                  if (index >= 0) {
                      form.setValue(`priceLevels.${index}.price`, parseFloat(levelPrice.toFixed(2)));
                  }
              });
              
              // Also update priceLevelFields for UI consistency
              priceLevelFields.forEach((field, index) => {
                  const levelDef = priceLevels.find((l: any) => l.id === field.levelId);
                  if (levelDef) {
                      const levelPrice = calculateSuggestedPrice(watchedCost, markup, 0, levelDef);
                      form.setValue(`priceLevels.${index}.price`, parseFloat(levelPrice.toFixed(2)));
                  }
              });
          }
      }
    } else {
      setMarkupSource(null);
    }

  }, [watchedCost, watchedCategoryName, watchedSubcategoryName, watchedBrandName, watchedSupplierId, categories, subcategories, brands, suppliers, form, priceLevels, priceLevelFields, systemSettings]);

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
          // Parse markupPriority if it's a string (from DB)
          let priority: string[] = ["subcategory", "category", "brand", "supplier"];
          if (systemSettings?.markupPriority) {
            if (typeof systemSettings.markupPriority === 'string') {
              try {
                priority = JSON.parse(systemSettings.markupPriority);
              } catch (e) {
                console.error('Failed to parse markupPriority:', e);
              }
            } else if (Array.isArray(systemSettings.markupPriority)) {
              priority = systemSettings.markupPriority;
            }
          }
          
          for (const type of priority) {
            if (type === 'subcategory' && subcategory?.markupPercentage !== undefined && subcategory.markupPercentage !== null) {
              markup = Number(subcategory.markupPercentage);
              break;
            } else if (type === 'category' && category?.markupPercentage !== undefined && category.markupPercentage !== null) {
              markup = Number(category.markupPercentage);
              break;
            } else if (type === 'brand' && brand?.markupPercentage !== undefined && brand.markupPercentage !== null) {
              markup = Number(brand.markupPercentage);
              break;
            }
          }
          
          const globalDefault = systemSettings?.defaultMarkupPercentage !== undefined ? Number(systemSettings.defaultMarkupPercentage) : undefined;
          if (!markup && globalDefault !== undefined) {
            markup = globalDefault;
          }
          
          const basePrice = cost * (1 + markup / 100);
          
          // Calculate price based on selected level
          let finalPrice;
          const selectedLevelMarkup = selectedLevel.percentageAdjustment ?? 0;
          if (selectedLevel.calculationBase === 'cost') {
             finalPrice = cost * (1 + selectedLevelMarkup / 100);
          } else {
             // Retail Base
             if (selectedLevelMarkup === 0 && selectedLevel.name?.toLowerCase() === 'retail') {
                 finalPrice = basePrice;
             } else {
                 finalPrice = basePrice * (1 + selectedLevelMarkup / 100);
             }
          }
          
          form.setValue('price', parseFloat(finalPrice.toFixed(2)));
          
          // ALSO update all price level fields automatically
          if (priceLevelFields.length > 0) {
            priceLevelFields.forEach((field, index) => {
              const levelDef = priceLevels.find((l: any) => l.id === field.levelId);
              if (levelDef) {
                // Calculate price for each level
                let levelPrice;
                const levelMarkup = levelDef.percentageAdjustment ?? 0;
                
                if (levelDef.calculationBase === 'cost') {
                    levelPrice = parseFloat((cost * (1 + levelMarkup / 100)).toFixed(2));
                } else {
                    // Retail Base
                    if (levelMarkup === 0 && levelDef.name?.toLowerCase() === 'retail') {
                        levelPrice = parseFloat(basePrice.toFixed(2));
                    } else {
                        levelPrice = parseFloat((basePrice * (1 + levelMarkup / 100)).toFixed(2));
                    }
                }
                form.setValue(`priceLevels.${index}.price`, levelPrice);
              }
            });
          }
        }
      }
    }
  }, [selectedPriceLevelId, priceLevels, priceLevelFields, form, categories, subcategories, brands, systemSettings]);



  async function onSubmit(values: ProductFormValues) {
    setIsSubmitting(true);

    try {
      const result = await addProduct({
        ...values,
        ...values,
        image: `https://picsum.photos/seed/${values.sku}/400/300`,
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
        window.dispatchEvent(new Event('stock-updated'));
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
        <Button size="sm" className="shadow-lg shadow-black/30">
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
                      value="price-levels"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                    >
                      Price Levels
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
                    {/* Buttons and Child Product Logic Removed as requested */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Row 1: Name and Brand */}
                      {/* Row 1: Name, Brand, VAT and Availability */}

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="col-span-2 sm:col-span-1">
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
                            <Select 
                              open={selects.brands}
                              onOpenChange={(open) => setSelects(prev => ({ ...prev, brands: open }))}
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a brand" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingBrands ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : brands?.length > 0 ? (
                                  brands.map((brand: Brand) => (
                                    <SelectItem key={brand.id} value={brand.name}>
                                      {brand.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>No brands found</SelectItem>
                                )}
                                <div className="border-t mt-1 pt-1 px-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDialogs(prev => ({ ...prev, brands: true }));
                                      setSelects(prev => ({ ...prev, brands: false }));
                                    }}
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Brand
                                  </Button>
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
                              <Textarea 
                                placeholder="A short description of the product." 
                                {...field} 
                                onKeyDown={(e) => {
                                  if (e.key === ' ') {
                                    e.stopPropagation();
                                  }
                                }}
                              />
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
                              <Textarea 
                                placeholder="Provide additional details like specifications or special notes." 
                                {...field} 
                                onKeyDown={(e) => {
                                  if (e.key === ' ') {
                                    e.stopPropagation();
                                  }
                                }}
                              />
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
                            <FormLabel>Category</FormLabel>
                            <Select 
                              open={selects.categories}
                              onOpenChange={(open) => setSelects(prev => ({ ...prev, categories: open }))}
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingCategories ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : categories?.length > 0 ? (
                                  categories.map((category: Category) => (
                                    <SelectItem key={category.id} value={category.name}>
                                      {category.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>No categories found</SelectItem>
                                )}
                                <div className="border-t mt-1 pt-1 px-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDialogs(prev => ({ ...prev, categories: true }));
                                      setSelects(prev => ({ ...prev, categories: false }));
                                    }}
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Category
                                  </Button>
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
                            <Select
                              open={selects.subcategories}
                              onOpenChange={(open) => setSelects(prev => ({ ...prev, subcategories: open }))}
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a subcategory" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingSubcategories ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : subcategories?.length > 0 ? (
                                  subcategories.map(sub => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)
                                ) : (
                                  <SelectItem value="none" disabled>No subcategories found</SelectItem>
                                )}
                                <div className="border-t mt-1 pt-1 px-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDialogs(prev => ({ ...prev, subcategories: true }));
                                      setSelects(prev => ({ ...prev, subcategories: false }));
                                    }}
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Subcategory
                                  </Button>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select 
                              open={selects.departments}
                              onOpenChange={(open) => setSelects(prev => ({ ...prev, departments: open }))}
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingDepartments ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : departments?.length > 0 ? (
                                  departments.map((dept: any) => (
                                    <SelectItem key={dept.id} value={dept.name}>
                                      {dept.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>No departments found</SelectItem>
                                )}
                                <div className="border-t mt-1 pt-1 px-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDialogs(prev => ({ ...prev, departments: true }));
                                      setSelects(prev => ({ ...prev, departments: false }));
                                    }}
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Department
                                  </Button>
                                </div>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="vatStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>VAT Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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

                      <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier (Optional)</FormLabel>
                            <Select
                              open={selects.suppliers}
                              onOpenChange={(open) => setSelects(prev => ({ ...prev, suppliers: open }))}
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a supplier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingSuppliers ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : suppliers?.length > 0 ? (
                                  suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)
                                ) : (
                                  <SelectItem value="none" disabled>No suppliers found</SelectItem>
                                )}
                                <div className="border-t mt-1 pt-1 px-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDialogs(prev => ({ ...prev, suppliers: true }));
                                      setSelects(prev => ({ ...prev, suppliers: false }));
                                    }}
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Supplier
                                  </Button>
                                </div>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="warehouse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warehouse (Optional)</FormLabel>
                            <Select
                              open={selects.warehouses}
                              onOpenChange={(open) => setSelects(prev => ({ ...prev, warehouses: open }))}
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a warehouse" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingWarehouses ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : warehouses?.length > 0 ? (
                                  warehouses.map((warehouse: any) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)
                                ) : (
                                  <SelectItem value="none" disabled>No warehouses found</SelectItem>
                                )}
                                <div className="border-t mt-1 pt-1 px-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDialogs(prev => ({ ...prev, warehouses: true }));
                                      setSelects(prev => ({ ...prev, warehouses: false }));
                                    }}
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Warehouse
                                  </Button>
                                </div>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="shelfLocationIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shelf Locations (Optional)</FormLabel>
                            <Popover>
                              <FormControl>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-auto min-h-10 text-left font-normal",
                                      !field.value?.length && "text-muted-foreground"
                                    )}
                                  >
                                    <div className="flex flex-wrap gap-1 pointer-events-none">
                                      {field.value && field.value.length > 0 ? (
                                        field.value.map((id) => {
                                          const location = (shelfLocations || []).find((l: any) => l.id === id);
                                          return (
                                            <Badge
                                              variant="secondary"
                                              key={id}
                                              className="mr-1 mb-1"
                                            >
                                              {location?.name || id}
                                            </Badge>
                                          );
                                        })
                                      ) : (
                                        "Select locations..."
                                      )}
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                              </FormControl>
                              <PopoverContent 
                                className="w-full min-w-[300px] p-0" 
                                align="start"
                              >
                                <Command className="w-full">
                                  <CommandInput placeholder="Search location..." />
                                  <CommandList className="max-h-[300px] overflow-y-auto">
                                    <CommandEmpty>No location found.</CommandEmpty>
                                    <CommandGroup>
                                      {(shelfLocations || []).map((loc: any) => (
                                        <CommandItem
                                          key={loc.id}
                                          value={loc.name}
                                          onSelect={() => {
                                            const current = field.value || [];
                                            const next = current.includes(loc.id)
                                              ? current.filter((id) => id !== loc.id)
                                              : [...current, loc.id];
                                            field.onChange(next);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value?.includes(loc.id)
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          {loc.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                  <div className="border-t mt-1 pt-1 px-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="w-full justify-start h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDialogs(prev => ({ ...prev, shelfLocations: true }));
                                      }}
                                    >
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Add Shelf Location
                                    </Button>
                                  </div>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="unitOfMeasure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{productType === 'parent' ? 'Base Unit of Measure' : 'Unit of Measure'}</FormLabel>
                            <Select 
                              open={selects.units}
                              onOpenChange={(open) => setSelects(prev => ({ ...prev, units: open }))}
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingUnits ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : unitsOfMeasure?.length > 0 ? (
                                  unitsOfMeasure.map((uom: UnitOfMeasure) => (
                                    <SelectItem key={uom.id} value={uom.name}>
                                      {uom.name} ({uom.abbreviation})
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>No units found</SelectItem>
                                )}
                                <div className="border-t mt-1 pt-1 px-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDialogs(prev => ({ ...prev, units: true }));
                                      setSelects(prev => ({ ...prev, units: false }));
                                    }}
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Unit
                                  </Button>
                                </div>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                              <FormLabel>Cost (â‚±)</FormLabel>
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
                                          <FormLabel className="text-xs">Price (â‚±)</FormLabel>
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

        {/* Lifted Manage Dialogs */}
        <ManageBrandsDialog
          trigger={null}
          open={dialogs.brands}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, brands: open }))}
          onBrandAdded={() => getBrands().then(setBrands)}
        />
        <ManageDepartmentsDialog
          trigger={null}
          open={dialogs.departments}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, departments: open }))}
          onDepartmentAdded={() => getDepartments().then(setDepartments)}
        />
        <ManageCategoriesDialog
          trigger={null}
          open={dialogs.categories}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, categories: open }))}
          onCategoryAdded={() => getCategories().then(setCategories)}
        />
        <ManageSubcategoriesDialog
          trigger={null}
          open={dialogs.subcategories}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, subcategories: open }))}
          onSubcategoryAdded={() => getSubcategories().then(setSubcategories)}
        />
        <ManageSuppliersDialog
          trigger={null}
          open={dialogs.suppliers}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, suppliers: open }))}
          onSupplierAdded={() => getSuppliers().then(setSuppliers)}
        />
        <ManageWarehousesDialog
          open={dialogs.warehouses}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, warehouses: open }))}
          onChange={() => getWarehouses().then(setWarehouses)}
        />
        <ManageShelfLocationsDialog
          open={dialogs.shelfLocations}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, shelfLocations: open }))}
          onLocationAdded={(newLocationId?: string) => {
            if (onOptionsRefresh) onOptionsRefresh();
            if (newLocationId) {
              const currentIds = form.getValues('shelfLocationIds') || [];
              if (!currentIds.includes(newLocationId)) {
                form.setValue('shelfLocationIds', [...currentIds, newLocationId], { shouldValidate: true, shouldDirty: true });
              }
            }
          }}
        />
        <ManageUnitOfMeasureDialog
          trigger={null}
          open={dialogs.units}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, units: open }))}
          onUnitAdded={() => getUnitsOfMeasure().then(setUnitsOfMeasure)}
        />

      </DialogContent>
    </Dialog>
  );
}

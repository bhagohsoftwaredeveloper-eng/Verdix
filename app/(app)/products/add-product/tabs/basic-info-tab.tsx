'use client';

import { PlusCircle, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category, Brand } from '@/lib/types';

import { useAddProductFormContext } from '../add-product-form-context';

export function BasicInfoTab() {
  const {
    form,
    brands, isLoadingBrands,
    categories, isLoadingCategories,
    subcategories, isLoadingSubcategories,
    selects, setSelects,
    setDialogs,
    generateSku,
    generateBarcode,
  } = useAddProductFormContext();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Row 1: Name and Brand */}
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
            <FormLabel>Barcode (EAN-8)</FormLabel>
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
  );
}

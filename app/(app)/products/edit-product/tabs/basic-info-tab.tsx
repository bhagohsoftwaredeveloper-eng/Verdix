'use client';

import { PlusCircle, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category, Brand } from '@/lib/types';

import { useEditProductFormContext } from '../edit-product-form-context';

export function BasicInfoTab() {
  const {
    form,
    brands,
    categories,
    subcategories,
    watchedBrandName,
    watchedCategoryName,
    watchedSubcategoryName,
    setSelects,
    selects,
    setDialogs,
    generateBarcode,
  } = useEditProductFormContext();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
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
                  {(() => {
                    const items = [];

                    // Add orphan brand if it exists and isn't in the list
                    if (watchedBrandName && !brands.some(b => b.name === watchedBrandName)) {
                      items.push(
                        <SelectItem key="orphan-brand" value={watchedBrandName}>
                          {watchedBrandName} (Missing in Settings)
                        </SelectItem>
                      );
                    }

                    if (brands?.length > 0) {
                      brands.forEach((brand: Brand) => {
                        items.push(
                          <SelectItem key={brand.id} value={brand.name}>
                            {brand.name}
                          </SelectItem>
                        );
                      });
                    }

                    return items.length > 0 ? items : (
                      <SelectItem value="none" disabled>No brands found</SelectItem>
                    );
                  })()}
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
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} readOnly className="bg-muted" />
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
              <FormLabel>Barcode (EAN-8)</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    placeholder="e.g., 123456789012"
                    {...field}
                    value={field.value ?? ''}
                    className="pr-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                  />
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
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {(() => {
                    const items = [];

                    // Add orphan category if it exists and isn't in the list
                    if (watchedCategoryName && !categories.some(cat => cat.name === watchedCategoryName)) {
                      items.push(
                        <SelectItem key="orphan-category" value={watchedCategoryName}>
                          {watchedCategoryName} (Missing in Settings)
                        </SelectItem>
                      );
                    }

                    if (categories?.length > 0) {
                      categories.forEach((cat: Category) => {
                        items.push(
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        );
                      });
                    }

                    return items.length > 0 ? items : (
                      <SelectItem value="none" disabled>No categories found</SelectItem>
                    );
                  })()}
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
                  {(() => {
                    const items = [];

                    // Add orphan subcategory if it exists and isn't in the list
                    if (watchedSubcategoryName && !subcategories.some(sub => sub.name === watchedSubcategoryName)) {
                      items.push(
                        <SelectItem key="orphan-subcategory" value={watchedSubcategoryName}>
                          {watchedSubcategoryName} (Missing in Settings)
                        </SelectItem>
                      );
                    }

                    if (subcategories?.length > 0) {
                      subcategories.forEach((sub: Category) => {
                        items.push(
                          <SelectItem key={sub.id} value={sub.name}>
                            {sub.name}
                          </SelectItem>
                        );
                      });
                    }

                    return items.length > 0 ? items : (
                      <SelectItem value="none" disabled>No subcategories found</SelectItem>
                    );
                  })()}
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
    </>
  );
}

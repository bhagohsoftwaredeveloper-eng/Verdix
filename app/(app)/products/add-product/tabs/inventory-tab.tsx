'use client';

import { PlusCircle, Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UnitOfMeasure } from '@/lib/types';

import { useAddProductFormContext } from '../add-product-form-context';

export function InventoryTab() {
  const {
    form,
    productType,
    departments, isLoadingDepartments,
    taxRates,
    suppliers, isLoadingSuppliers,
    warehouses, isLoadingWarehouses,
    shelfLocations,
    unitsOfMeasure, isLoadingUnits,
    selects, setSelects,
    setDialogs,
  } = useAddProductFormContext();

  return (
    <>
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
    </>
  );
}

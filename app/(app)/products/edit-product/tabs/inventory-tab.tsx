'use client';

import { PlusCircle, Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn, formatQuantity } from '@/lib/utils';
import { UnitOfMeasure } from '@/lib/types';
import type { Supplier } from '@/lib/types';

import { useEditProductFormContext } from '../edit-product-form-context';
import { InlineEditableSelect } from '../../components/inline-editable-select';
import {
  addDepartment, updateDepartment,
  addSupplier, updateSupplier, getSuppliers,
  addUnitOfMeasure, updateUnitOfMeasure,
} from '../../actions';

export function InventoryTab() {
  const {
    form,
    product,
    departments, isLoadingDepartments,
    taxRates,
    suppliers,
    warehouses,
    shelfLocations,
    units,
    selects, setSelects,
    setDialogs,
    refreshDepartments,
    refreshSuppliers,
    refreshUnits,
  } = useEditProductFormContext();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <InlineEditableSelect
                items={departments}
                isLoading={isLoadingDepartments}
                value={field.value}
                onChange={field.onChange}
                open={selects.departments}
                onOpenChange={(o) => setSelects((p) => ({ ...p, departments: o }))}
                placeholder="Select a department"
                addLabel="Add Department"
                emptyLabel="No departments found"
                getId={(d: any) => d.id}
                getValue={(d: any) => d.name}
                getOptionLabel={(d: any) => d.name}
                getName={(d: any) => d.name}
                onAdd={async (name) => {
                  const r = await addDepartment(name, 0);
                  if (r.success) { await refreshDepartments(); return name; }
                  return undefined;
                }}
                onRename={async (id, name) => {
                  const existing = departments.find((d: any) => d.id === id);
                  const r = await updateDepartment(id, name, existing?.markupPercentage);
                  if (r.success) { await refreshDepartments(); return name; }
                  return undefined;
                }}
              />
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

        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem className="col-span-1">
              <FormLabel>Supplier (Optional)</FormLabel>
              <InlineEditableSelect
                items={suppliers}
                isLoading={false}
                value={field.value}
                onChange={field.onChange}
                open={selects.suppliers}
                onOpenChange={(o) => setSelects((p) => ({ ...p, suppliers: o }))}
                placeholder="Select a supplier"
                addLabel="Add Supplier"
                emptyLabel="No suppliers found"
                getId={(s: Supplier) => s.id}
                getValue={(s: Supplier) => s.id}
                getOptionLabel={(s: Supplier) => s.name}
                getName={(s: Supplier) => s.name}
                onAdd={async (name) => {
                  const r = await addSupplier({ name });
                  if (r.success) {
                    await refreshSuppliers();
                    const fresh = await getSuppliers();
                    const created = fresh.find((s) => s.name === name);
                    return created?.id;
                  }
                  return undefined;
                }}
                onRename={async (id, name) => {
                  const existing = suppliers.find((s: Supplier) => s.id === id);
                  if (!existing) return undefined;
                  const r = await updateSupplier(id, { ...existing, name });
                  if (r.success) { await refreshSuppliers(); return id; }
                  return undefined;
                }}
              />
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
                  {warehouses?.length > 0 ? (
                    warehouses.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))
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
                          field.value.map((id: string) => {
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
                                ? current.filter((id: string) => id !== loc.id)
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
              <FormLabel>Unit of Measure</FormLabel>
              <InlineEditableSelect
                items={units}
                isLoading={false}
                value={field.value}
                onChange={field.onChange}
                open={selects.units}
                onOpenChange={(o) => setSelects((p) => ({ ...p, units: o }))}
                placeholder="Select a unit"
                addLabel="Add Unit"
                emptyLabel="No units found"
                getId={(u: UnitOfMeasure) => u.id}
                getValue={(u: UnitOfMeasure) => u.name}
                getOptionLabel={(u: UnitOfMeasure) => `${u.name} (${u.abbreviation})`}
                getName={(u: UnitOfMeasure) => u.name}
                onAdd={async (name) => {
                  const r = await addUnitOfMeasure(name, name);
                  if (r.success) { await refreshUnits(); return name; }
                  return undefined;
                }}
                onRename={async (id, name) => {
                  const existing = units.find((u: UnitOfMeasure) => u.id === id);
                  const r = await updateUnitOfMeasure(id, name, existing?.abbreviation ?? name);
                  if (r.success) { await refreshUnits(); return name; }
                  return undefined;
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Initial Stock</Label>
          <div>
            <Input type="text" value={formatQuantity(product.stock || 0)} disabled />
          </div>
          <p className="text-sm text-muted-foreground">Stock is updated via transactions.</p>
        </div>
        <FormField
          control={form.control}
          name="reorderPoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reorder Point</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" value={field.value != null ? formatQuantity(field.value) : ''} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
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
    </div>
  );
}

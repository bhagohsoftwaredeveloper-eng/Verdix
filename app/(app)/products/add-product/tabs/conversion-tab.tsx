'use client';

import { PlusCircle, Wand2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnitOfMeasure } from '@/lib/types';

import { useAddProductFormContext } from '../add-product-form-context';

export function ConversionTab() {
  const {
    form,
    autoCreateChild, setAutoCreateChild,
    conversionFactorFields, appendConversionFactor, removeConversionFactor,
    unitsOfMeasure, isLoadingUnits,
    selectedUnitOfMeasure,
  } = useAddProductFormContext();

  return (
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
  );
}
